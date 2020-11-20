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

#![allow(clippy::needless_update)] // https://github.com/rust-lang/rust-clippy/issues/6323

use futures_core::Stream;
use std::pin::Pin;
use tonic::{transport::Server, Request, Response, Status};

use rustboard_core::proto::tensorboard::data::{
    self,
    tensor_board_data_provider_server::{TensorBoardDataProvider, TensorBoardDataProviderServer},
};

#[derive(Debug)]
struct DataProviderHandler;

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
            start_time: 1605752017.0,
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
                max_wall_time: 1605752022.0,
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
                wall_time: (0..=4).map(|i| 1605752018.0 + (i as f64)).collect(),
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

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = "[::0]:6806".parse::<std::net::SocketAddr>()?;
    let handler = DataProviderHandler;
    Server::builder()
        .add_service(TensorBoardDataProviderServer::new(handler))
        .serve(addr)
        .await?;
    Ok(())
}
