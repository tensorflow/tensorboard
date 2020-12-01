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
use std::borrow::Borrow;
use std::collections::HashMap;
use std::collections::HashSet;
use std::convert::TryInto;
use std::hash::Hash;
use std::pin::Pin;
use std::sync::{RwLock, RwLockReadGuard};
use tonic::{Request, Response, Status};

use crate::commit::{self, Commit};
use crate::downsample;
use crate::proto::tensorboard::data;
use crate::types::{Run, Tag, WallTime};
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
        req: Request<data::ListScalarsRequest>,
    ) -> Result<Response<data::ListScalarsResponse>, Status> {
        let req = req.into_inner();
        let want_plugin = parse_plugin_filter(req.plugin_filter)?;
        let (run_filter, tag_filter) = parse_rtf(req.run_tag_filter);
        let runs = self.read_runs()?;

        let mut res: data::ListScalarsResponse = Default::default();
        for (run, data) in runs.iter() {
            if !run_filter.want(run) {
                continue;
            }
            let data = data
                .read()
                .map_err(|_| Status::internal(format!("failed to read run data for {:?}", run)))?;
            let mut run_res: data::list_scalars_response::RunEntry = Default::default();
            for (tag, ts) in &data.scalars {
                if !tag_filter.want(tag) {
                    continue;
                }
                let plugin_name = ts
                    .metadata
                    .plugin_data
                    .as_ref()
                    .map(|pd| pd.plugin_name.as_str());
                if plugin_name != Some(&want_plugin) {
                    continue;
                }
                let max_step = match ts.valid_values().last() {
                    None => continue,
                    Some((step, _, _)) => step,
                };
                // TODO(@wchargin): Consider tracking this on the time series itself?
                let max_wall_time = ts
                    .valid_values()
                    .map(|(_, wt, _)| wt)
                    .max()
                    .expect("have valid values for step but not wall time");
                run_res.tags.push(data::list_scalars_response::TagEntry {
                    tag_name: tag.0.clone(),
                    metadata: Some(data::ScalarMetadata {
                        max_step: max_step.into(),
                        max_wall_time: max_wall_time.into(),
                        summary_metadata: Some(*ts.metadata.clone()),
                        ..Default::default()
                    }),
                    ..Default::default()
                });
            }
            if !run_res.tags.is_empty() {
                run_res.run_name = run.0.clone();
                res.runs.push(run_res);
            }
        }

        Ok(Response::new(res))
    }

    async fn read_scalars(
        &self,
        req: Request<data::ReadScalarsRequest>,
    ) -> Result<Response<data::ReadScalarsResponse>, Status> {
        let req = req.into_inner();
        let want_plugin = parse_plugin_filter(req.plugin_filter)?;
        let (run_filter, tag_filter) = parse_rtf(req.run_tag_filter);
        let num_points = parse_downsample(req.downsample)?;
        let runs = self.read_runs()?;

        let mut res: data::ReadScalarsResponse = Default::default();
        for (run, data) in runs.iter() {
            if !run_filter.want(run) {
                continue;
            }
            let data = data
                .read()
                .map_err(|_| Status::internal(format!("failed to read run data for {:?}", run)))?;
            let mut run_res: data::read_scalars_response::RunEntry = Default::default();
            for (tag, ts) in &data.scalars {
                if !tag_filter.want(tag) {
                    continue;
                }
                let plugin_name = ts
                    .metadata
                    .plugin_data
                    .as_ref()
                    .map(|pd| pd.plugin_name.as_str());
                if plugin_name != Some(&want_plugin) {
                    continue;
                }

                let mut points = ts.valid_values().collect::<Vec<_>>();
                downsample::downsample(&mut points, num_points);
                let n = points.len();
                let mut steps = Vec::with_capacity(n);
                let mut wall_times = Vec::with_capacity(n);
                let mut values = Vec::with_capacity(n);
                for (step, wall_time, &commit::ScalarValue(value)) in points {
                    steps.push(step.into());
                    wall_times.push(wall_time.into());
                    values.push(value);
                }

                run_res.tags.push(data::read_scalars_response::TagEntry {
                    tag_name: tag.0.clone(),
                    data: Some(data::ScalarData {
                        step: steps,
                        wall_time: wall_times,
                        value: values,
                        ..Default::default()
                    }),
                    ..Default::default()
                });
            }
            if !run_res.tags.is_empty() {
                run_res.run_name = run.0.clone();
                res.runs.push(run_res);
            }
        }

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

/// Parses a request plugin filter. Returns the desired plugin name, or an error if that's empty.
fn parse_plugin_filter(pf: Option<data::PluginFilter>) -> Result<String, Status> {
    let want_plugin = pf.unwrap_or_default().plugin_name;
    if want_plugin.is_empty() {
        return Err(Status::invalid_argument(
            "must specify non-empty plugin name",
        ));
    }
    Ok(want_plugin)
}

/// Parses a `RunTagFilter` from a request.
fn parse_rtf(rtf: Option<data::RunTagFilter>) -> (Filter<Run>, Filter<Tag>) {
    let rtf = rtf.unwrap_or_default();
    let run_filter = match rtf.runs {
        None => Filter::All,
        Some(data::RunFilter { names }) => Filter::Just(names.into_iter().map(Run).collect()),
    };
    let tag_filter = match rtf.tags {
        None => Filter::All,
        Some(data::TagFilter { names }) => Filter::Just(names.into_iter().map(Tag).collect()),
    };
    (run_filter, tag_filter)
}

/// Parses `Downsample.num_points` from a request, failing if it's not given or invalid.
fn parse_downsample(downsample: Option<data::Downsample>) -> Result<usize, Status> {
    let num_points = downsample
        .ok_or_else(|| Status::invalid_argument("must specify downsample"))?
        .num_points;
    if num_points < 0 {
        return Err(Status::invalid_argument(format!(
            "num_points must be non-negative; got {}",
            num_points
        )));
    }
    num_points.try_into().map_err(|_| {
        Status::out_of_range(format!(
            "num_points ({}) is too large for this system; max: {}",
            num_points,
            usize::MAX
        ))
    })
}

/// A predicate that accepts either all values or just an explicit set of values.
enum Filter<T> {
    All,
    Just(HashSet<T>),
}

impl<T: Hash + Eq> Filter<T> {
    /// Tests whether this filter matches a specific item.
    //
    // TODO(@wchargin): Consider offering a function that enables callers with a `Filter<T>` and a
    // `HashMap<K, V>` to iterate over matching `(&K, &V)`s by only iterating over this filter's
    // explicit set in the `Just` case, optimizing for the case when `Just` is small.
    pub fn want<Q: ?Sized>(&self, value: &Q) -> bool
    where
        T: Borrow<Q>,
        Q: Hash + Eq,
    {
        match self {
            Filter::All => true,
            Filter::Just(which) => which.contains(value),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tonic::Code;

    use crate::commit::{ScalarValue, TimeSeries};
    use crate::data_compat;
    use crate::proto::tensorboard as pb;
    use crate::reservoir::StageReservoir;
    use crate::types::{Run, Step, Tag, WallTime};

    /// Creates a commit with some test data.
    fn sample_commit() -> Commit {
        let commit = Commit::new();

        let mut runs = commit.runs.write().unwrap();

        fn scalar_series(points: Vec<(Step, WallTime, f32)>) -> TimeSeries<ScalarValue> {
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

    /// Converts a list of `RunEntry`s into a nested map from `Run` to `Tag` to `TagEntry`, for
    /// easy assertions that don't depend on serialization order.
    ///
    /// This is a macro so that it can be generic over the response types, which don't implement
    /// any common trait but do share field names `run_name`, `tags`, and `tag_name`.
    macro_rules! run_tag_map {
        ($items:expr) => {
            $items
                .into_iter()
                .map(|run| {
                    let run_name = Run(run.run_name);
                    let tags = run
                        .tags
                        .into_iter()
                        .map(|tag| {
                            let tag_name = Tag(tag.tag_name.clone());
                            (tag_name, tag)
                        })
                        .collect();
                    (run_name, tags)
                })
                .collect::<HashMap<Run, HashMap<Tag, _>>>()
        };
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

        assert_eq!(res.runs.len(), 2);
        let map = run_tag_map!(res.runs);

        let train_run = &map[&Run("train".to_string())];
        assert_eq!(train_run.len(), 1);
        let xent_metadata = &train_run[&Tag("xent".to_string())]
            .metadata
            .as_ref()
            .unwrap();
        assert_eq!(xent_metadata.max_step, 2);
        assert_eq!(xent_metadata.max_wall_time, 1237.0);
        assert_eq!(
            xent_metadata
                .summary_metadata
                .as_ref()
                .unwrap()
                .plugin_data
                .as_ref()
                .unwrap()
                .plugin_name,
            "scalars".to_string()
        );

        let test_run = &map[&Run("test".to_string())];
        assert_eq!(test_run.len(), 1);
        let accuracy_metadata = &test_run[&Tag("accuracy".to_string())]
            .metadata
            .as_ref()
            .unwrap();
        assert_eq!(accuracy_metadata.max_wall_time, 6237.0);
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
            run_tag_filter: Some(data::RunTagFilter {
                runs: Some(data::RunFilter {
                    names: vec!["train".to_string(), "nonexistent".to_string()],
                    ..Default::default()
                }),
                tags: None,
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
        let map = run_tag_map!(res.runs);

        let train_run = &map[&Run("train".to_string())];
        assert_eq!(train_run.len(), 1);
        let xent_data = &train_run[&Tag("xent".to_string())].data.as_ref().unwrap();
        assert_eq!(xent_data.step, vec![0, 1, 2]);
        assert_eq!(xent_data.wall_time, vec![1235.0, 1236.0, 1237.0]);
        assert_eq!(xent_data.value, vec![0.5, 0.25, 0.125]);
    }

    #[tokio::test]
    async fn test_read_scalars_needs_downsample() {
        let handler = sample_handler();
        let req = Request::new(data::ReadScalarsRequest {
            experiment_id: "123".to_string(),
            plugin_filter: Some(data::PluginFilter {
                plugin_name: "scalars".to_string(),
                ..Default::default()
            }),
            downsample: None,
            ..Default::default()
        });
        let res = handler.read_scalars(req).await.unwrap_err();
        match (res.code(), res.message()) {
            (Code::InvalidArgument, msg) if msg.contains("downsample") => (),
            other => panic!("{:?}", other),
        };
    }

    #[tokio::test]
    async fn test_read_scalars_downsample_zero_okay() {
        let handler = sample_handler();
        let req = Request::new(data::ReadScalarsRequest {
            experiment_id: "123".to_string(),
            plugin_filter: Some(data::PluginFilter {
                plugin_name: "scalars".to_string(),
                ..Default::default()
            }),
            downsample: Some(data::Downsample {
                num_points: 0,
                ..Default::default()
            }),
            ..Default::default()
        });
        let res = handler.read_scalars(req).await.unwrap().into_inner();
        let map = run_tag_map!(res.runs);
        let train_run = &map[&Run("train".to_string())];
        let xent_data = &train_run[&Tag("xent".to_string())].data.as_ref().unwrap();
        assert_eq!(xent_data.value, Vec::new());
    }
}
