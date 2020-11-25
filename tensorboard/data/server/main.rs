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

<<<<<<< HEAD
use log::{info, LevelFilter};
=======
>>>>>>> 5f3b099444fdb69fb3988e312cfbc8408812e303
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
    init_logging(LevelFilter::Info);

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
<<<<<<< HEAD
            info!("Starting load cycle");
            let start = Instant::now();
            loader.reload();
            let end = Instant::now();
            info!("Finished load cycle ({:?})", end - start);
=======
            eprintln!("beginning load cycle");
            let start = Instant::now();
            loader.reload();
            let end = Instant::now();
            eprintln!("finished load cycle ({:?})", end - start);
>>>>>>> 5f3b099444fdb69fb3988e312cfbc8408812e303
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

/// Installs a logging handler whose behavior is determined by the `RUST_LOG` environment variable
/// (per <https://docs.rs/env_logger> semantics), or by including all logs at `default_log_level`
/// or above if `RUST_LOG_LEVEL` is not given.
fn init_logging(default_log_level: LevelFilter) {
    use env_logger::{Builder, Env};
    Builder::from_env(Env::default().default_filter_or(default_log_level.to_string())).init();
}
