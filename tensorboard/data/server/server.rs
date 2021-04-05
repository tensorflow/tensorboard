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

use async_stream::try_stream;
use bytes::Bytes;
use futures_core::Stream;
use std::borrow::{Borrow, Cow};
use std::collections::HashMap;
use std::collections::HashSet;
use std::convert::TryInto;
use std::hash::Hash;
use std::pin::Pin;
use std::sync::{Arc, RwLock, RwLockReadGuard};
use tonic::{Request, Response, Status};

use crate::blob_key::BlobKey;
use crate::commit::{self, BlobSequenceValue, Commit};
use crate::downsample;
use crate::proto::tensorboard as pb;
use crate::proto::tensorboard::data;
use crate::types::{Run, Tag, WallTime};
use data::tensor_board_data_provider_server::TensorBoardDataProvider;

/// Data provider gRPC service implementation.
#[derive(Debug)]
pub struct DataProviderHandler {
    pub data_location: String,
    pub commit: Arc<Commit>,
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

/// Maximum size (in bytes) of the `data` field of any single [`data::ReadBlobResponse`].
const BLOB_CHUNK_SIZE: usize = 1024 * 1024 * 8;

fn plugin_name(md: &pb::SummaryMetadata) -> Option<&str> {
    md.plugin_data.as_ref().map(|pd| pd.plugin_name.as_str())
}

#[tonic::async_trait]
impl TensorBoardDataProvider for DataProviderHandler {
    async fn get_experiment(
        &self,
        _request: Request<data::GetExperimentRequest>,
    ) -> Result<Response<data::GetExperimentResponse>, Status> {
        Ok(Response::new(data::GetExperimentResponse {
            data_location: self.data_location.clone(),
            ..Default::default()
        }))
    }

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
            for metadata in (data.scalars.values().map(|ts| ts.metadata.as_ref()))
                .chain(data.tensors.values().map(|ts| ts.metadata.as_ref()))
                .chain(data.blob_sequences.values().map(|ts| ts.metadata.as_ref()))
            {
                let plugin_name = match &metadata.plugin_data {
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
                if plugin_name(&ts.metadata) != Some(&want_plugin) {
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
                if plugin_name(&ts.metadata) != Some(&want_plugin) {
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
        req: Request<data::ListTensorsRequest>,
    ) -> Result<Response<data::ListTensorsResponse>, Status> {
        let req = req.into_inner();
        let want_plugin = parse_plugin_filter(req.plugin_filter)?;
        let (run_filter, tag_filter) = parse_rtf(req.run_tag_filter);
        let runs = self.read_runs()?;

        let mut res: data::ListTensorsResponse = Default::default();
        for (run, data) in runs.iter() {
            if !run_filter.want(run) {
                continue;
            }
            let data = data
                .read()
                .map_err(|_| Status::internal(format!("failed to read run data for {:?}", run)))?;
            let mut run_res: data::list_tensors_response::RunEntry = Default::default();
            for (tag, ts) in &data.tensors {
                if !tag_filter.want(tag) {
                    continue;
                }
                if plugin_name(&ts.metadata) != Some(&want_plugin) {
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
                run_res.tags.push(data::list_tensors_response::TagEntry {
                    tag_name: tag.0.clone(),
                    metadata: Some(data::TensorMetadata {
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

    async fn read_tensors(
        &self,
        req: Request<data::ReadTensorsRequest>,
    ) -> Result<Response<data::ReadTensorsResponse>, Status> {
        let req = req.into_inner();
        let want_plugin = parse_plugin_filter(req.plugin_filter)?;
        let (run_filter, tag_filter) = parse_rtf(req.run_tag_filter);
        let num_points = parse_downsample(req.downsample)?;
        let runs = self.read_runs()?;

        let mut res: data::ReadTensorsResponse = Default::default();
        for (run, data) in runs.iter() {
            if !run_filter.want(run) {
                continue;
            }
            let data = data
                .read()
                .map_err(|_| Status::internal(format!("failed to read run data for {:?}", run)))?;
            let mut run_res: data::read_tensors_response::RunEntry = Default::default();
            for (tag, ts) in &data.tensors {
                if !tag_filter.want(tag) {
                    continue;
                }
                if plugin_name(&ts.metadata) != Some(&want_plugin) {
                    continue;
                }

                let mut points = ts.valid_values().collect::<Vec<_>>();
                downsample::downsample(&mut points, num_points);
                let n = points.len();
                let mut steps = Vec::with_capacity(n);
                let mut wall_times = Vec::with_capacity(n);
                let mut values = Vec::with_capacity(n);
                for (step, wall_time, value) in points {
                    steps.push(step.into());
                    wall_times.push(wall_time.into());
                    // Clone the TensorProto to get a copy to send in the response.
                    values.push(value.clone());
                }

                run_res.tags.push(data::read_tensors_response::TagEntry {
                    tag_name: tag.0.clone(),
                    data: Some(data::TensorData {
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

    async fn list_blob_sequences(
        &self,
        req: Request<data::ListBlobSequencesRequest>,
    ) -> Result<Response<data::ListBlobSequencesResponse>, Status> {
        let req = req.into_inner();
        let want_plugin = parse_plugin_filter(req.plugin_filter)?;
        let (run_filter, tag_filter) = parse_rtf(req.run_tag_filter);
        let runs = self.read_runs()?;

        let mut res: data::ListBlobSequencesResponse = Default::default();
        for (run, data) in runs.iter() {
            if !run_filter.want(run) {
                continue;
            }
            let data = data
                .read()
                .map_err(|_| Status::internal(format!("failed to read run data for {:?}", run)))?;
            let mut run_res: data::list_blob_sequences_response::RunEntry = Default::default();
            for (tag, ts) in &data.blob_sequences {
                if !tag_filter.want(tag) {
                    continue;
                }
                if plugin_name(&ts.metadata) != Some(&want_plugin) {
                    continue;
                }
                let (mut max_step, mut max_wall_time, mut max_length) = (None, None, None);
                for (step, wall_time, value) in ts.valid_values() {
                    if max_step.map_or(true, |s| s < step) {
                        max_step = Some(step);
                    }
                    if max_wall_time.map_or(true, |wt| wt < wall_time) {
                        max_wall_time = Some(wall_time);
                    }
                    if max_length.map_or(true, |len| len < value.0.len()) {
                        max_length = Some(value.0.len());
                    }
                }
                let (max_step, max_wall_time, max_length) =
                    match (max_step, max_wall_time, max_length) {
                        (Some(s), Some(wt), Some(len)) => (s, wt, len),
                        _ => continue,
                    };
                run_res
                    .tags
                    .push(data::list_blob_sequences_response::TagEntry {
                        tag_name: tag.0.clone(),
                        metadata: Some(data::BlobSequenceMetadata {
                            max_step: max_step.into(),
                            max_wall_time: max_wall_time.into(),
                            max_length: max_length as i64,
                            summary_metadata: Some(*ts.metadata.clone()),
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

    async fn read_blob_sequences(
        &self,
        req: Request<data::ReadBlobSequencesRequest>,
    ) -> Result<Response<data::ReadBlobSequencesResponse>, Status> {
        let req = req.into_inner();
        let want_plugin = parse_plugin_filter(req.plugin_filter)?;
        let (run_filter, tag_filter) = parse_rtf(req.run_tag_filter);
        let num_points = parse_downsample(req.downsample)?;
        let runs = self.read_runs()?;

        let mut res: data::ReadBlobSequencesResponse = Default::default();
        for (run, data) in runs.iter() {
            if !run_filter.want(run) {
                continue;
            }
            let data = data
                .read()
                .map_err(|_| Status::internal(format!("failed to read run data for {:?}", run)))?;
            let mut run_res: data::read_blob_sequences_response::RunEntry = Default::default();
            for (tag, ts) in &data.blob_sequences {
                if !tag_filter.want(tag) {
                    continue;
                }
                if plugin_name(&ts.metadata) != Some(&want_plugin) {
                    continue;
                }

                let mut points = ts.valid_values().collect::<Vec<_>>();
                downsample::downsample(&mut points, num_points);
                let n = points.len();
                let mut steps = Vec::with_capacity(n);
                let mut wall_times = Vec::with_capacity(n);
                let mut values = Vec::with_capacity(n);
                for (step, wall_time, &BlobSequenceValue(ref value)) in points {
                    steps.push(step.into());
                    wall_times.push(wall_time.into());
                    let eid = req.experiment_id.as_str();
                    let blob_refs = (0..value.len())
                        .map(|i| {
                            let bk = BlobKey {
                                experiment_id: Cow::Borrowed(eid),
                                run: Cow::Borrowed(run.0.as_str()),
                                tag: Cow::Borrowed(tag.0.as_str()),
                                step,
                                index: i,
                            };
                            data::BlobReference {
                                blob_key: bk.to_string(),
                                url: String::new(),
                            }
                        })
                        .collect::<Vec<data::BlobReference>>();
                    values.push(data::BlobReferenceSequence { blob_refs });
                }

                run_res
                    .tags
                    .push(data::read_blob_sequences_response::TagEntry {
                        tag_name: tag.0.clone(),
                        data: Some(data::BlobSequenceData {
                            step: steps,
                            wall_time: wall_times,
                            values,
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

    type ReadBlobStream =
        Pin<Box<dyn Stream<Item = Result<data::ReadBlobResponse, Status>> + Send + Sync + 'static>>;

    async fn read_blob(
        &self,
        req: Request<data::ReadBlobRequest>,
    ) -> Result<Response<Self::ReadBlobStream>, Status> {
        let req = req.into_inner();
        let bk: BlobKey = req
            .blob_key
            .parse()
            .map_err(|e| Status::invalid_argument(format!("failed to parse blob key: {:?}", e,)))?;

        let runs = self.read_runs()?;
        let run_data = runs
            .get(bk.run.as_ref())
            .ok_or_else(|| Status::not_found(format!("no such run: {:?}", bk.run)))?
            .read()
            .map_err(|_| Status::internal(format!("failed to read run data for {:?}", bk.run)))?;
        let ts = run_data
            .blob_sequences
            .get(bk.tag.as_ref())
            .ok_or_else(|| {
                Status::not_found(format!("run {:?} has no such tag: {:?}", bk.run, bk.tag))
            })?;
        let datum = ts
            .valid_values()
            .find_map(
                |(step, _, value)| {
                    if step == bk.step {
                        Some(value)
                    } else {
                        None
                    }
                },
            )
            .ok_or_else(|| {
                Status::not_found(format!(
                    "run {:?}, tag {:?} has no step {}; may have been evicted",
                    bk.run, bk.tag, bk.step.0
                ))
            })?;
        let blobs = &datum.0;
        let blob = blobs.get(bk.index).ok_or_else(|| {
            Status::not_found(format!(
                "blob sequence at run {:?}, tag {:?}, step {:?} has no index {} (length: {})",
                bk.run,
                bk.tag,
                bk.step,
                bk.index,
                blobs.len()
            ))
        })?;
        // Clone blob so that we can send it down to the client after dropping the lock.
        let blob = Bytes::clone(blob); // cheap
        drop(run_data);
        drop(runs);

        let stream = try_stream! {
            for chunk in blob.chunks(BLOB_CHUNK_SIZE) {
                yield data::ReadBlobResponse {data: blob.slice_ref(chunk)};
            }
        };

        Ok(Response::new(Box::pin(stream) as Self::ReadBlobStream))
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
    use tokio_stream::StreamExt;
    use tonic::Code;

    use crate::commit::test_data::CommitBuilder;
    use crate::types::{Run, Step, Tag};

    fn sample_handler(commit: Commit) -> DataProviderHandler {
        DataProviderHandler {
            data_location: String::from("./logs/mnist"),
            commit: Arc::new(commit),
        }
    }

    #[tokio::test]
    async fn test_get_experiment() {
        let commit = CommitBuilder::new().build();
        let handler = sample_handler(commit);
        let req = Request::new(data::GetExperimentRequest {
            experiment_id: "123".to_string(),
        });
        let res = handler.get_experiment(req).await.unwrap().into_inner();
        assert_eq!(res.data_location, "./logs/mnist"); // from `sample_handler`
        assert_eq!(res.creation_time, None);
    }

    #[tokio::test]
    async fn test_list_plugins() {
        let commit = CommitBuilder::new()
            .scalars("train", "xent", |b| b.build())
            .tensors("train", "weights", |mut b| {
                b.plugin_name("histograms").build()
            })
            .blob_sequences("train", "input_image", |mut b| {
                b.plugin_name("images").build()
            })
            .build();
        let handler = sample_handler(commit);
        let req = Request::new(data::ListPluginsRequest {
            experiment_id: "123".to_string(),
        });
        let res = handler.list_plugins(req).await.unwrap().into_inner();
        assert_eq!(
            res.plugins
                .iter()
                .map(|p| p.name.as_str())
                .collect::<HashSet<&str>>(),
            vec!["scalars", "histograms", "images"]
                .into_iter()
                .collect::<HashSet<&str>>(),
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
        let plugin_data = pb::summary_metadata::PluginData {
            plugin_name: "custom_scalars".to_string(),
            ..Default::default()
        };
        let custom_metadata = pb::SummaryMetadata {
            plugin_data: Some(plugin_data),
            ..Default::default()
        };
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
        let mut listed_plugins = handler
            .list_plugins(req)
            .await
            .unwrap()
            .into_inner()
            .plugins
            .into_iter()
            .map(|p| p.name)
            .collect::<Vec<_>>();
        let mut expected_plugins = vec!["custom_scalars", "scalars"];
        listed_plugins.sort_unstable();
        expected_plugins.sort_unstable();
        assert_eq!(listed_plugins, expected_plugins);
    }

    #[tokio::test]
    async fn test_list_plugins_no_data() {
        let commit = CommitBuilder::new().build();
        let handler = sample_handler(commit);
        let req = Request::new(data::ListPluginsRequest {
            experiment_id: "123".to_string(),
        });
        let res = handler.list_plugins(req).await.unwrap().into_inner();
        assert_eq!(
            res.plugins.into_iter().map(|p| p.name).collect::<Vec<_>>(),
            Vec::<String>::new()
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
        assert_eq!(xent_data.value, Vec::<f32>::new());
    }

    #[tokio::test]
    async fn test_list_tensors() {
        let commit = CommitBuilder::new()
            .run("run_with_no_data", None)
            .scalars("train", "accuracy", |b| b.build())
            .tensors("train", "weights", |b| b.build())
            .tensors("test", "weights", |mut b| {
                b.wall_time_start(1235.0).step_start(0).len(3).build()
            })
            .build();
        let handler = sample_handler(commit);
        let req = Request::new(data::ListTensorsRequest {
            experiment_id: "123".to_string(),
            plugin_filter: Some(data::PluginFilter {
                plugin_name: "tensors".to_string(),
            }),
            ..Default::default()
        });
        let res = handler.list_tensors(req).await.unwrap().into_inner();

        assert_eq!(res.runs.len(), 2);
        let map = run_tag_map!(res.runs);

        let test_run = &map[&Run("test".to_string())];
        assert_eq!(test_run.len(), 1);
        let weights_metadata = &test_run[&Tag("weights".to_string())]
            .metadata
            .as_ref()
            .unwrap();
        assert_eq!(weights_metadata.max_step, 2);
        assert_eq!(weights_metadata.max_wall_time, 1237.0);
        assert_eq!(
            weights_metadata
                .summary_metadata
                .as_ref()
                .unwrap()
                .plugin_data
                .as_ref()
                .unwrap()
                .plugin_name,
            "tensors".to_string()
        );
    }

    #[tokio::test]
    async fn test_read_tensors() {
        fn make_string_tensor_proto(value: impl Into<Bytes>) -> pb::TensorProto {
            pb::TensorProto {
                dtype: pb::DataType::DtString.into(),
                tensor_shape: None, // Scalar shape
                string_val: vec![value.into()],
                ..Default::default()
            }
        }
        let commit = CommitBuilder::new()
            .tensors("train", "status", |mut b| {
                b.plugin_name("text")
                    .len(3)
                    .wall_time_start(1235.0)
                    .step_start(0)
                    .eval(|Step(i)| make_string_tensor_proto(format!("Step {}", i)))
                    .build()
            })
            .tensors("test", "weights", |b| b.build())
            .build();
        let handler = sample_handler(commit);
        let req = Request::new(data::ReadTensorsRequest {
            experiment_id: "123".to_string(),
            plugin_filter: Some(data::PluginFilter {
                plugin_name: "text".to_string(),
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

        let res = handler.read_tensors(req).await.unwrap().into_inner();

        assert_eq!(res.runs.len(), 1);
        let map = run_tag_map!(res.runs);

        let train_run = &map[&Run("train".to_string())];
        assert_eq!(train_run.len(), 1);
        let status_data = &train_run[&Tag("status".to_string())].data.as_ref().unwrap();
        assert_eq!(status_data.step, vec![0, 1, 2]);
        assert_eq!(status_data.wall_time, vec![1235.0, 1236.0, 1237.0]);
        assert_eq!(
            status_data.value,
            vec![
                make_string_tensor_proto("Step 0"),
                make_string_tensor_proto("Step 1"),
                make_string_tensor_proto("Step 2"),
            ]
        );
    }

    #[tokio::test]
    async fn test_blob_sequences() {
        let commit = CommitBuilder::new()
            .scalars("train", "accuracy", |b| b.build())
            .blob_sequences("train", "input", |mut b| {
                b.plugin_name("images")
                    .wall_time_start(1234.0)
                    .values(vec![
                        BlobSequenceValue(vec![
                            Bytes::from_static(b"step0img0"),
                            Bytes::from_static(b"step0img1"),
                        ]),
                        BlobSequenceValue(vec![Bytes::from(b"z".repeat(BLOB_CHUNK_SIZE * 3 / 2))]),
                    ])
                    .build()
            })
            .blob_sequences("another_run", "input", |mut b| {
                b.plugin_name("not_images").build()
            })
            .build();
        let handler = sample_handler(commit);

        // List blob sequences and check the response exactly. It doesn't have any blob keys, so
        // the exact value is well defined.
        let list_req = Request::new(data::ListBlobSequencesRequest {
            experiment_id: "123".to_string(),
            plugin_filter: Some(data::PluginFilter {
                plugin_name: "images".to_string(),
            }),
            run_tag_filter: None,
        });
        let list_res = handler
            .list_blob_sequences(list_req)
            .await
            .expect("ListBlobSequences")
            .into_inner();
        assert_eq!(
            list_res,
            data::ListBlobSequencesResponse {
                runs: vec![data::list_blob_sequences_response::RunEntry {
                    run_name: "train".to_string(),
                    tags: vec![data::list_blob_sequences_response::TagEntry {
                        tag_name: "input".to_string(),
                        metadata: Some(data::BlobSequenceMetadata {
                            max_step: 1,
                            max_wall_time: 1235.0,
                            max_length: 2,
                            summary_metadata: Some(pb::SummaryMetadata {
                                plugin_data: Some(pb::summary_metadata::PluginData {
                                    plugin_name: "images".to_string(),
                                    ..Default::default()
                                }),
                                data_class: pb::DataClass::BlobSequence.into(),
                                ..Default::default()
                            }),
                        }),
                    }],
                }],
            }
        );

        // Read blob sequences and check that its structure is right. The actual blob keys are
        // opaque, so we don't expect any specific values.
        let read_req = Request::new(data::ReadBlobSequencesRequest {
            experiment_id: "123".to_string(),
            plugin_filter: Some(data::PluginFilter {
                plugin_name: "images".to_string(),
            }),
            downsample: Some(data::Downsample { num_points: 1000 }),
            run_tag_filter: Some(data::RunTagFilter {
                runs: Some(data::RunFilter {
                    names: vec!["train".to_string()],
                }),
                tags: Some(data::TagFilter {
                    names: vec!["input".to_string()],
                }),
            }),
        });
        let read_res = handler
            .read_blob_sequences(read_req)
            .await
            .expect("ReadBlobSequences")
            .into_inner();
        assert_eq!(read_res.runs.len(), 1);
        assert_eq!(read_res.runs[0].tags.len(), 1);
        let data = (read_res.runs[0].tags[0].data.as_ref()).expect("blob sequence data");

        assert_eq!(data.step, vec![0, 1]);
        assert_eq!(data.wall_time, vec![1234.0, 1235.0]);
        assert_eq!(data.values.len(), 2);
        assert_eq!(data.values[0].blob_refs.len(), 2);
        assert_eq!(data.values[1].blob_refs.len(), 1);

        // Read the blob that's supposed to take multiple chunks.
        let blob_req = Request::new(data::ReadBlobRequest {
            blob_key: data.values[1].blob_refs[0].blob_key.clone(),
        });
        let mut blob_res = handler
            .read_blob(blob_req)
            .await
            .expect("ReadBlob")
            .into_inner();
        let mut chunks = Vec::new();
        while let Some(chunk) = blob_res.next().await {
            let chunk = chunk.unwrap_or_else(|_| panic!("chunk {}", chunks.len()));
            chunks.push(chunk.data);
        }
        let expected_chunks = vec![
            b"z".repeat(BLOB_CHUNK_SIZE),
            b"z".repeat(BLOB_CHUNK_SIZE / 2),
        ];
        assert_eq!(chunks, expected_chunks);
    }
}
