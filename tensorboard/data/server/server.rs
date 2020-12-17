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
use crate::proto::tensorboard as pb;
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
        let runs = self.read_runs()?;
        // Collect set of plugin names.
        let mut plugin_names = HashSet::new();
        for (run, data) in runs.iter() {
            let data = data
                .read()
                .map_err(|_| Status::internal(format!("failed to read run data for {:?}", run)))?;
            for time_series in data.scalars.values() {
                let metadata: &pb::SummaryMetadata = time_series.metadata.as_ref();
                let plugin_name = match &metadata.plugin_data.as_ref() {
                    Some(d) => d.plugin_name.clone(),
                    None => String::new(),
                };
                plugin_names.insert(plugin_name);
            }
        }
        // Move out of set into a new ListPluginsResponse.
        let res = data::ListPluginsResponse {
            plugins: plugin_names
                .into_iter()
                .map(|name| data::Plugin { name })
                .collect(),
        };
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
                })
                .collect(),
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
                    }),
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
// Allow comparing raw wall times on responses. Wall times are always passed through as opaque
// values (we don't do arithmetic on them), so comparing them for exact equality is okay.
#[allow(clippy::float_cmp)]
mod tests {
    use super::*;
    use tonic::Code;

    use crate::commit::test_data::CommitBuilder;
    use crate::types::{Run, Step, Tag};

    fn sample_handler(commit: Commit) -> DataProviderHandler {
        DataProviderHandler {
            // Leak the commit object, since the Tonic server must have only 'static references.
            commit: Box::leak(Box::new(commit)),
        }
    }

    #[tokio::test]
    async fn test_list_plugins() {
        let commit = CommitBuilder::new()
            .scalars("train", "xent", |b| b.build())
            .build();
        let handler = sample_handler(commit);
        let req = Request::new(data::ListPluginsRequest {
            experiment_id: "123".to_string(),
        });
        let res = handler.list_plugins(req).await.unwrap().into_inner();
        assert_eq!(
            res.plugins.into_iter().map(|p| p.name).collect::<Vec<_>>(),
            vec!["scalars"]
        );
    }

    #[tokio::test]
    async fn test_list_plugins_multiple_timeseries_same_type() {
        let commit = CommitBuilder::new()
            .scalars("train", "xent2", |b| b.build())
            .scalars("train", "xent", |b| b.build())
            .build();
        let handler = sample_handler(commit);
        let req = Request::new(data::ListPluginsRequest {
            experiment_id: "123".to_string(),
        });
        let res = handler.list_plugins(req).await.unwrap().into_inner();
        assert_eq!(
            res.plugins.into_iter().map(|p| p.name).collect::<Vec<_>>(),
            vec!["scalars"]
        );
    }

    #[tokio::test]
    async fn test_list_plugins_multiple_timeseries_different_types() {
        let mut custom_metadata = pb::SummaryMetadata::default();
        let mut plugin_data = pb::summary_metadata::PluginData::default();
        plugin_data.plugin_name = "custom_scalars".to_string();
        custom_metadata.plugin_data = Some(plugin_data);
        let commit = CommitBuilder::new()
            .scalars("train", "xent2", |b| b.build())
            .scalars("train", "xent", |mut b| {
                b.metadata(Some(Box::new(custom_metadata))).build()
            })
            .build();
        let handler = sample_handler(commit);
        let req = Request::new(data::ListPluginsRequest {
            experiment_id: "123".to_string(),
        });
        let res = handler.list_plugins(req).await.unwrap().into_inner();
        assert_eq!(
            res.plugins
                .into_iter()
                .map(|p| p.name)
                .collect::<Vec<_>>()
                .sort(),
            vec!["custom_scalars", "scalars"].sort()
        );
    }

    #[tokio::test]
    async fn test_list_plugins_no_data() {
        let commit = CommitBuilder::new().build();
        let handler = sample_handler(commit);
        let req = Request::new(data::ListPluginsRequest {
            experiment_id: "123".to_string(),
        });
        let res = handler.list_plugins(req).await.unwrap().into_inner();
        let expected: Vec<String> = vec![];
        assert_eq!(
            res.plugins
                .into_iter()
                .map(|p| p.name)
                .collect::<Vec<String>>(),
            expected
        );
    }

    #[tokio::test]
    async fn test_list_runs() {
        let commit = CommitBuilder::new()
            .run("train", Some(1234.0))
            .run("test", Some(6234.0))
            .run("run_with_no_data", None)
            .scalars("train", "xent", |mut b| b.wall_time_start(1235.0).build())
            .scalars("test", "acc", |mut b| b.wall_time_start(6235.0).build())
            .build();
        let handler = sample_handler(commit);
        let req = Request::new(data::ListRunsRequest {
            experiment_id: "123".to_string(),
        });
        let res = handler.list_runs(req).await.unwrap().into_inner();
        assert_eq!(
            res.runs,
            vec![
                data::Run {
                    name: "train".to_string(),
                    start_time: 1234.0,
                },
                data::Run {
                    name: "test".to_string(),
                    start_time: 6234.0,
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
        let commit = CommitBuilder::new()
            .run("train", Some(1234.0))
            .run("test", Some(6234.0))
            .run("run_with_no_data", None)
            .scalars("train", "xent", |mut b| {
                b.wall_time_start(1235.0).step_start(0).len(3).build()
            })
            .scalars("test", "accuracy", |mut b| {
                b.wall_time_start(6235.0).step_start(0).len(3).build()
            })
            .build();
        let handler = sample_handler(commit);
        let req = Request::new(data::ListScalarsRequest {
            experiment_id: "123".to_string(),
            plugin_filter: Some(data::PluginFilter {
                plugin_name: "scalars".to_string(),
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
        let commit = CommitBuilder::new()
            .scalars("train", "xent", |mut b| {
                b.len(3)
                    .wall_time_start(1235.0)
                    .step_start(0)
                    .eval(|Step(i)| 0.5f32.powi(i as i32))
                    .build()
            })
            .scalars("test", "xent", |b| b.build())
            .build();
        let handler = sample_handler(commit);
        let req = Request::new(data::ReadScalarsRequest {
            experiment_id: "123".to_string(),
            plugin_filter: Some(data::PluginFilter {
                plugin_name: "scalars".to_string(),
            }),
            run_tag_filter: Some(data::RunTagFilter {
                runs: Some(data::RunFilter {
                    names: vec!["train".to_string(), "nonexistent".to_string()],
                }),
                tags: None,
            }),
            downsample: Some(data::Downsample { num_points: 1000 }),
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
        assert_eq!(xent_data.value, vec![1.0, 0.5, 0.25]);
    }

    #[tokio::test]
    async fn test_read_scalars_needs_downsample() {
        let handler = sample_handler(Commit::default());
        let req = Request::new(data::ReadScalarsRequest {
            experiment_id: "123".to_string(),
            plugin_filter: Some(data::PluginFilter {
                plugin_name: "scalars".to_string(),
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
        let commit = CommitBuilder::new()
            .scalars("train", "xent", |b| b.build())
            .scalars("test", "xent", |b| b.build())
            .build();
        let handler = sample_handler(commit);
        let req = Request::new(data::ReadScalarsRequest {
            experiment_id: "123".to_string(),
            plugin_filter: Some(data::PluginFilter {
                plugin_name: "scalars".to_string(),
            }),
            downsample: Some(data::Downsample { num_points: 0 }),
            ..Default::default()
        });
        let res = handler.read_scalars(req).await.unwrap().into_inner();
        let map = run_tag_map!(res.runs);
        let train_run = &map[&Run("train".to_string())];
        let xent_data = &train_run[&Tag("xent".to_string())].data.as_ref().unwrap();
        assert_eq!(xent_data.value, Vec::new());
    }
}
