/* Copyright 2020 The TensorFlow Authors. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==============================================================================*/

use futures_core::Stream;
use std::collections::HashMap;
use std::pin::Pin;
use std::sync::{RwLock, RwLockReadGuard};
use tonic::{Request, Response, Status};

use crate::commit::{self, Commit};
use crate::proto::tensorboard::data;
use crate::types::{Run, WallTime};
use data::tensor_board_data_provider_server::TensorBoardDataProvider;

/// Data provider gRPC service implementation.
#[derive(Debug)]
pub struct DataProviderHandler {
    pub commit: &'static Commit,
}

impl DataProviderHandler {
    /// Obtains a read-lock to `self.commit.runs`, or fails with `Status::internal`.
    fn read_runs(&self) -> Result<RwLockReadGuard<HashMap<Run, RwLock<commit::RunData>>>, Status> {
        self.commit
            .runs
            .read()
            .map_err(|_| Status::internal("failed to read commit.runs"))
    }
}

const FAKE_START_TIME: f64 = 1605752017.0;

#[tonic::async_trait]
impl TensorBoardDataProvider for DataProviderHandler {
    async fn list_plugins(
        &self,
        _request: Request<data::ListPluginsRequest>,
    ) -> Result<Response<data::ListPluginsResponse>, Status> {
        let mut res: data::ListPluginsResponse = Default::default();
        res.plugins.push(data::Plugin {
            name: "scalars".to_string(),
            ..Default::default()
        });
        Ok(Response::new(res))
    }

    async fn list_runs(
        &self,
        _request: Request<data::ListRunsRequest>,
    ) -> Result<Response<data::ListRunsResponse>, Status> {
        let runs = self.read_runs()?;

        // Buffer up started runs to sort by wall time. Keep `WallTime` rather than projecting down
        // to f64 so that we're guaranteed that they're non-NaN and can sort them.
        let mut results: Vec<(Run, WallTime)> = Vec::with_capacity(runs.len());
        for (run, data) in runs.iter() {
            let data = data
                .read()
                .map_err(|_| Status::internal(format!("failed to read run data for {:?}", run)))?;
            if let Some(start_time) = data.start_time {
                results.push((run.clone(), start_time));
            }
        }
        results.sort_by_key(|&(_, start_time)| start_time);
        drop(runs); // release lock a bit earlier

        let res = data::ListRunsResponse {
            runs: results
                .into_iter()
                .map(|(Run(name), start_time)| data::Run {
                    name,
                    start_time: start_time.into(),
                    ..Default::default()
                })
                .collect(),
            ..Default::default()
        };
        Ok(Response::new(res))
    }

    async fn list_scalars(
        &self,
        _request: Request<data::ListScalarsRequest>,
    ) -> Result<Response<data::ListScalarsResponse>, Status> {
        let mut res: data::ListScalarsResponse = Default::default();
        let mut run: data::list_scalars_response::RunEntry = Default::default();
        run.run_name = "train".to_string();
        run.tags.push(data::list_scalars_response::TagEntry {
            tag_name: "accuracy".to_string(),
            metadata: Some(data::ScalarMetadata {
                max_step: 5,
                max_wall_time: FAKE_START_TIME + 5.0,
                ..Default::default()
            }),
            ..Default::default()
        });
        res.runs.push(run);
        Ok(Response::new(res))
    }

    async fn read_scalars(
        &self,
        _request: Request<data::ReadScalarsRequest>,
    ) -> Result<Response<data::ReadScalarsResponse>, Status> {
        let mut res: data::ReadScalarsResponse = Default::default();
        let mut run: data::read_scalars_response::RunEntry = Default::default();
        run.run_name = "train".to_string();
        run.tags.push(data::read_scalars_response::TagEntry {
            tag_name: "accuracy".to_string(),
            data: Some(data::ScalarData {
                step: vec![0, 1, 2, 3, 4],
                wall_time: (0..=4)
                    .map(|i| FAKE_START_TIME + ((i + 1) as f64))
                    .collect(),
                value: vec![0.1, 0.5, 0.8, 0.9, 0.95],
                ..Default::default()
            }),
            ..Default::default()
        });
        res.runs.push(run);
        Ok(Response::new(res))
    }

    async fn list_tensors(
        &self,
        _request: Request<data::ListTensorsRequest>,
    ) -> Result<Response<data::ListTensorsResponse>, Status> {
        Err(Status::unimplemented("not yet implemented"))
    }

    async fn read_tensors(
        &self,
        _request: Request<data::ReadTensorsRequest>,
    ) -> Result<Response<data::ReadTensorsResponse>, Status> {
        Err(Status::unimplemented("not yet implemented"))
    }

    async fn list_blob_sequences(
        &self,
        _request: Request<data::ListBlobSequencesRequest>,
    ) -> Result<Response<data::ListBlobSequencesResponse>, Status> {
        Err(Status::unimplemented("not yet implemented"))
    }

    async fn read_blob_sequences(
        &self,
        _request: Request<data::ReadBlobSequencesRequest>,
    ) -> Result<Response<data::ReadBlobSequencesResponse>, Status> {
        Err(Status::unimplemented("not yet implemented"))
    }

    type ReadBlobStream =
        Pin<Box<dyn Stream<Item = Result<data::ReadBlobResponse, Status>> + Send + Sync + 'static>>;

    async fn read_blob(
        &self,
        _request: Request<data::ReadBlobRequest>,
    ) -> Result<Response<Self::ReadBlobStream>, Status> {
        Err(Status::unimplemented("not yet implemented"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use crate::commit::{ScalarValue, TimeSeries};
    use crate::data_compat;
    use crate::proto::tensorboard as pb;
    use crate::reservoir::StageReservoir;
    use crate::types::{Run, Step, Tag, WallTime};

    /// Creates a commit with some test data.
    fn sample_commit() -> Commit {
        let commit = Commit::new();

        let mut runs = commit.runs.write().unwrap();

        fn scalar_series(points: Vec<(Step, WallTime, f64)>) -> TimeSeries<ScalarValue> {
            use pb::summary::value::Value::SimpleValue;
            let mut ts = commit::TimeSeries::new(
                data_compat::SummaryValue(Box::new(SimpleValue(0.0))).initial_metadata(None),
            );
            let mut rsv = StageReservoir::new(points.len());
            for (step, wall_time, value) in points {
                rsv.offer(step, (wall_time, Ok(commit::ScalarValue(value))));
            }
            rsv.commit(&mut ts.basin);
            ts
        }

        let mut train = runs
            .entry(Run("train".to_string()))
            .or_default()
            .write()
            .unwrap();
        train.start_time = Some(WallTime::new(1234.0).unwrap());
        train.scalars.insert(
            Tag("xent".to_string()),
            scalar_series(vec![
                (Step(0), WallTime::new(1235.0).unwrap(), 0.5),
                (Step(1), WallTime::new(1236.0).unwrap(), 0.25),
                (Step(2), WallTime::new(1237.0).unwrap(), 0.125),
            ]),
        );
        drop(train);

        let mut test = runs
            .entry(Run("test".to_string()))
            .or_default()
            .write()
            .unwrap();
        test.start_time = Some(WallTime::new(6234.0).unwrap());
        test.scalars.insert(
            Tag("accuracy".to_string()),
            scalar_series(vec![
                (Step(0), WallTime::new(6235.0).unwrap(), 0.125),
                (Step(1), WallTime::new(6236.0).unwrap(), 0.25),
                (Step(2), WallTime::new(6237.0).unwrap(), 0.5),
            ]),
        );
        drop(test);

        // An run with no start time or data: should not show up in results.
        runs.entry(Run("empty".to_string())).or_default();

        drop(runs);
        commit
    }

    fn sample_handler() -> DataProviderHandler {
        DataProviderHandler {
            // Leak the commit object, since the Tonic server must have only 'static references.
            commit: Box::leak(Box::new(sample_commit())),
        }
    }

    #[tokio::test]
    async fn test_list_plugins() {
        let handler = sample_handler();
        let req = Request::new(data::ListPluginsRequest {
            experiment_id: "123".to_string(),
            ..Default::default()
        });
        let res = handler.list_plugins(req).await.unwrap().into_inner();
        assert_eq!(
            res.plugins.into_iter().map(|p| p.name).collect::<Vec<_>>(),
            vec!["scalars"]
        );
    }

    #[tokio::test]
    async fn test_list_runs() {
        let handler = sample_handler();
        let req = Request::new(data::ListRunsRequest {
            experiment_id: "123".to_string(),
            ..Default::default()
        });
        let res = handler.list_runs(req).await.unwrap().into_inner();
        assert_eq!(
            res.runs,
            vec![
                data::Run {
                    name: "train".to_string(),
                    start_time: 1234.0,
                    ..Default::default()
                },
                data::Run {
                    name: "test".to_string(),
                    start_time: 6234.0,
                    ..Default::default()
                },
            ]
        );
    }

    #[tokio::test]
    async fn test_list_scalars() {
        let handler = sample_handler();
        let req = Request::new(data::ListScalarsRequest {
            experiment_id: "123".to_string(),
            plugin_filter: Some(data::PluginFilter {
                plugin_name: "scalars".to_string(),
                ..Default::default()
            }),
            ..Default::default()
        });
        let res = handler.list_scalars(req).await.unwrap().into_inner();
        assert_eq!(res.runs.len(), 1);
        assert_eq!(res.runs[0].tags.len(), 1);
        // fake data; don't bother checking the contents
    }

    #[tokio::test]
    async fn test_read_scalars() {
        let handler = sample_handler();
        let req = Request::new(data::ReadScalarsRequest {
            experiment_id: "123".to_string(),
            plugin_filter: Some(data::PluginFilter {
                plugin_name: "scalars".to_string(),
                ..Default::default()
            }),
            downsample: Some(data::Downsample {
                num_points: 1000,
                ..Default::default()
            }),
            ..Default::default()
        });
        let res = handler.read_scalars(req).await.unwrap().into_inner();
        assert_eq!(res.runs.len(), 1);
        assert_eq!(res.runs[0].tags.len(), 1);
        // fake data; don't bother checking the contents
    }
}
