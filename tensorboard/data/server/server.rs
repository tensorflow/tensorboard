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
use std::pin::Pin;
use tonic::{Request, Response, Status};

use crate::proto::tensorboard::data;
use data::tensor_board_data_provider_server::TensorBoardDataProvider;

/// Data provider gRPC service implementation.
#[derive(Debug)]
pub struct DataProviderHandler;

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
        let mut res: data::ListRunsResponse = Default::default();
        res.runs.push(data::Run {
            name: "train".to_string(),
            start_time: FAKE_START_TIME,
            ..Default::default()
        });
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

    use futures_core::Future;
    use tokio::runtime::Runtime;

    /// Executes the given future in a new, temporary event loop.
    fn block_on<F: Future>(future: F) -> F::Output {
        let mut rt = Runtime::new().unwrap();
        rt.block_on(future)
    }

    #[test]
    fn test_list_plugins() {
        let handler = DataProviderHandler;
        let req = Request::new(data::ListPluginsRequest {
            experiment_id: "123".to_string(),
            ..Default::default()
        });
        let res = block_on(handler.list_plugins(req)).unwrap().into_inner();
        assert_eq!(
            res.plugins.into_iter().map(|p| p.name).collect::<Vec<_>>(),
            vec!["scalars"]
        );
    }

    #[test]
    fn test_list_runs() {
        let handler = DataProviderHandler;
        let req = Request::new(data::ListRunsRequest {
            experiment_id: "123".to_string(),
            ..Default::default()
        });
        let res = block_on(handler.list_runs(req)).unwrap().into_inner();
        assert_eq!(res.runs.len(), 1);
        let run = &res.runs[0];
        assert_eq!(run.start_time, FAKE_START_TIME);
        assert_eq!(run.name, "train");
    }

    #[test]
    fn test_list_scalars() {
        let handler = DataProviderHandler;
        let req = Request::new(data::ListScalarsRequest {
            experiment_id: "123".to_string(),
            plugin_filter: Some(data::PluginFilter {
                plugin_name: "scalars".to_string(),
                ..Default::default()
            }),
            ..Default::default()
        });
        let res = block_on(handler.list_scalars(req)).unwrap().into_inner();
        assert_eq!(res.runs.len(), 1);
        assert_eq!(res.runs[0].tags.len(), 1);
        // fake data; don't bother checking the contents
    }

    #[test]
    fn test_read_scalars() {
        let handler = DataProviderHandler;
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
        let res = block_on(handler.read_scalars(req)).unwrap().into_inner();
        assert_eq!(res.runs.len(), 1);
        assert_eq!(res.runs[0].tags.len(), 1);
        // fake data; don't bother checking the contents
    }
}
