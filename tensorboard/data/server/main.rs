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

use std::path::PathBuf;
use std::time::{Duration, Instant};
use tonic::transport::Server;

use rustboard_core::commit::Commit;
use rustboard_core::logdir::LogdirLoader;
use rustboard_core::proto::tensorboard::data::tensor_board_data_provider_server::TensorBoardDataProviderServer;
use rustboard_core::server::DataProviderHandler;

const RELOAD_INTERVAL: Duration = Duration::from_secs(5);

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = "[::0]:6806".parse::<std::net::SocketAddr>()?;
    let logdir = match std::env::args_os().nth(1) {
        Some(d) => PathBuf::from(d),
        None => {
            eprintln!("fatal: specify logdir as first command-line argument");
            std::process::exit(1);
        }
    };

    // Leak the commit object, since the Tonic server must have only 'static references. This only
    // leaks the outer commit structure (of constant size), not the pointers to the actual data.
    let commit: &'static Commit = Box::leak(Box::new(Commit::new()));
    std::thread::spawn(move || {
        let mut loader = LogdirLoader::new(commit, logdir);
        loop {
            eprintln!("beginning load cycle");
            let start = Instant::now();
            loader.reload();
            let end = Instant::now();
            eprintln!("finished load cycle ({:?})", end - start);
            std::thread::sleep(RELOAD_INTERVAL);
        }
    });

    let handler = DataProviderHandler { commit };
    Server::builder()
        .add_service(TensorBoardDataProviderServer::new(handler))
        .serve(addr)
        .await?;
    Ok(())
}
