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
use std::sync::Arc;
use std::time::Instant;

use rustboard_core::commit::Commit;
use rustboard_core::logdir::LogdirLoader;
use rustboard_core::{cli::dynamic_logdir::DynLogdir, types::PluginSamplingHint};

#[derive(Clap)]
struct Opts {
    #[clap(long)]
    logdir: PathBuf,
    #[clap(long, default_value = "info")]
    log_level: String,
    #[clap(long)]
    reload_threads: Option<usize>,
    // Pair of `--no-checksum` and `--checksum` flags, defaulting to "no checksum".
    #[clap(long, multiple_occurrences = true, overrides_with = "checksum")]
    #[allow(unused)]
    no_checksum: bool,
    #[clap(long, multiple_occurrences = true, overrides_with = "no_checksum")]
    checksum: bool,
}

fn main() {
    let opts: Opts = Opts::parse();
    init_logging(&opts);

    let commit = Commit::new();
    let logdir = DynLogdir::new(opts.logdir).expect("DynLogdir::new");
    let mut loader = LogdirLoader::new(
        &commit,
        logdir,
        opts.reload_threads.unwrap_or(0),
        Arc::new(PluginSamplingHint::default()),
    );
    loader.checksum(opts.checksum); // if neither `--[no-]checksum` given, defaults to false

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
