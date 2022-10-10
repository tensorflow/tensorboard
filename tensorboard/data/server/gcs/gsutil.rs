/* Copyright 2021 The TensorFlow Authors. All Rights Reserved.

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

//! CLI for testing GCS integration.

use clap::Clap;
use std::io::Write;

use rustboard_core::gcs;

#[derive(Clap, Debug)]
#[clap(name = "gsutil")]
struct Opts {
    #[clap(long, default_value = "info")]
    log_level: String,
    #[clap(subcommand)]
    subcmd: Subcommand,
}

#[derive(Clap, Debug)]
enum Subcommand {
    /// List objects in a bucket.
    Ls(LsOpts),
    /// Print (partial) object contents.
    Cat(CatOpts),
}

#[derive(Clap, Debug)]
struct LsOpts {
    bucket: String,
    #[clap(long, default_value = "", setting(clap::ArgSettings::AllowEmptyValues))]
    prefix: String,
}

#[derive(Clap, Debug)]
struct CatOpts {
    bucket: String,
    object: String,
    /// Initial byte offset, inclusive [default: start of object].
    #[clap(long)]
    from: Option<u64>,
    /// Final byte offset, inclusive [default: end of object].
    #[clap(long)]
    to: Option<u64>,
}

fn main() {
    let opts: Opts = Opts::parse();
    init_logging(&opts);

    let client = gcs::Client::new().unwrap();
    match opts.subcmd {
        Subcommand::Ls(opts) => {
            log::info!("ENTER gcs::Client::list");
            let objects = client.list(&opts.bucket, &opts.prefix);
            log::info!("LEAVE gcs::Client::list");
            for name in objects.unwrap() {
                println!("{}", name);
            }
        }
        Subcommand::Cat(opts) => {
            log::info!("ENTER gcs::Client::read");
            let range = (opts.from.unwrap_or(0))..=(opts.to.unwrap_or(u64::MAX));
            let buf = client.read(&opts.bucket, &opts.object, range);
            log::info!("LEAVE gcs::Client::read");
            std::io::stdout().write_all(&buf.unwrap()).unwrap();
        }
    }
}

fn init_logging(opts: &Opts) {
    use env_logger::{Builder, Env};
    Builder::from_env(Env::default().default_filter_or(&opts.log_level))
        .format_timestamp_micros()
        .init();
}
