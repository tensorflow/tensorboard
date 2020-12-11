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

//! Simple benchmark to completely load a logdir and then exit.

use clap::Clap;
use log::info;
use std::path::PathBuf;
use std::time::Instant;

use rustboard_core::commit::Commit;
use rustboard_core::logdir::LogdirLoader;

#[derive(Clap)]
struct Opts {
    #[clap(long)]
    logdir: PathBuf,
    #[clap(long, default_value = "info")]
    log_level: String,
}

fn main() {
    let opts: Opts = Opts::parse();
    init_logging(&opts);

    let commit = Commit::new();
    let mut loader = LogdirLoader::new(&commit, opts.logdir);

    info!("Starting load cycle");
    let start = Instant::now();
    loader.reload();
    let end = Instant::now();
    info!("Finished load cycle ({:?})", end - start);
}

fn init_logging(opts: &Opts) {
    use env_logger::{Builder, Env};
    Builder::from_env(Env::default().default_filter_or(&opts.log_level))
        .format_timestamp_micros()
        .init();
}
