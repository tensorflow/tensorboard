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

//! Command-line interface for the main entry point.

use clap::Clap;
use log::{debug, error, info, LevelFilter};
use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::str::FromStr;
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use tokio::net::TcpListener;
use tokio_stream::wrappers::TcpListenerStream;
use tonic::transport::Server;

use crate::commit::Commit;
use crate::logdir::LogdirLoader;
use crate::proto::tensorboard::data;
use crate::server::DataProviderHandler;
use crate::types::PluginSamplingHint;

use data::tensor_board_data_provider_server::TensorBoardDataProviderServer;

pub mod dynamic_logdir;
use dynamic_logdir::DynLogdir;

#[derive(Clap, Debug)]
#[clap(name = "rustboard", version = crate::VERSION)]
struct Opts {
    /// Log directory to load
    ///
    /// Directory to recursively scan for event files (files matching the `*tfevents*` glob). This
    /// directory, its descendants, and its event files will be periodically polled for new data.
    ///
    /// If this log directory is invalid or unsupported, exits with status 8.
    #[clap(long, setting(clap::ArgSettings::AllowEmptyValues))]
    logdir: PathBuf,

    /// Bind to this host name
    ///
    /// Host to bind this server to. May be an IPv4 address (e.g., 127.0.0.1 or 0.0.0.0), an IPv6
    /// address (e.g., ::1 or ::0), or a string like `localhost` to pass to `getaddrinfo(3)`.
    #[clap(long, default_value = "localhost")]
    host: String,

    /// Bind to this port
    ///
    /// Port to bind this server to. Use `0` to request an arbitrary free port from the OS.
    #[clap(long, default_value = "6806")]
    port: u16,

    /// Seconds to sleep between reloads, or "once"
    ///
    /// Number of seconds to wait between finishing one load cycle and starting the next one. This
    /// does not include the time for the reload itself. If "once", data will be loaded only once.
    #[clap(long, default_value = "5", value_name = "secs")]
    reload: ReloadStrategy,

    /// Use verbose output (-vv for very verbose output)
    #[clap(long = "verbose", short, parse(from_occurrences))]
    verbosity: u32,

    /// Kill this server once stdin is closed
    ///
    /// While this server is running, read stdin to end of file and then kill the server. Used to
    /// portably ensure that the server exits when the parent process dies, even due to a crash.
    /// Don't set this if stdin is connected to a tty and the process will be backgrounded, since
    /// then the server will receive `SIGTTIN` and its process will be stopped (in the `SIGSTOP`
    /// sense) but not killed.
    #[clap(long)]
    die_after_stdin: bool,

    /// Write bound port to this file
    ///
    /// Once a server socket is opened, write the port on which it's listening to the file at this
    /// path. Useful with `--port 0`. Port will be written as ASCII decimal followed by a newline
    /// (e.g., "6806\n"). If the server fails to start, this file may not be written at all. If the
    /// port file is specified but cannot be written, the server will die.
    ///
    /// This also suppresses the "listening on HOST:PORT" line that is otherwise written to stderr
    /// when the server starts.
    #[clap(long)]
    port_file: Option<PathBuf>,

    /// Write startup errors to this file
    ///
    /// If the logdir is invalid or unsupported, write the error message to this file instead of to
    /// stderr. That way, you can capture this output while still keeping stderr open for normal
    /// logging.
    #[clap(long)]
    error_file: Option<PathBuf>,

    /// Checksum all records (negate with `--no-checksum`)
    ///
    /// With `--checksum`, every record will be checksummed before being parsed. With
    /// `--no-checksum` (the default), records are only checksummed if parsing fails. Skipping
    /// checksums for records that successfully parse can be significantly faster, but also means
    /// that some bit flips may not be detected.
    #[clap(long, multiple_occurrences = true, overrides_with = "no_checksum")]
    checksum: bool,

    /// Only checksum records that fail to parse
    ///
    /// Negates `--checksum`. This is the default.
    #[clap(
        long,
        multiple_occurrences = true,
        overrides_with = "checksum",
        hidden = true
    )]
    #[allow(unused)]
    no_checksum: bool,

    /// Set explicit series sampling
    ///
    /// A comma separated list of `plugin_name=num_samples` pairs to explicitly specify how many
    /// samples to keep per tag for the specified plugin. For unspecified plugins, series are
    /// randomly downsampled to reasonable values to prevent out-of-memory errors in long-running
    /// jobs. Each `num_samples` may be the special token `all` to retain all data without
    /// downsampling. For instance, `--samples_per_plugin=scalars=500,images=all,audio=0` keeps 500
    /// events in each scalar series, all of the images, and none of the audio.
    #[clap(long, default_value = "", setting(clap::ArgSettings::AllowEmptyValues))]
    samples_per_plugin: PluginSamplingHint,
}

#[derive(Debug, Copy, Clone, PartialEq, Eq)]
enum ReloadStrategy {
    Loop { delay: Duration },
    Once,
}
impl FromStr for ReloadStrategy {
    type Err = <u64 as FromStr>::Err;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        if s == "once" {
            Ok(ReloadStrategy::Once)
        } else {
            Ok(ReloadStrategy::Loop {
                delay: Duration::from_secs(s.parse()?),
            })
        }
    }
}

/// Exit code for failure of [`DynLogdir::new`].
// Keep in sync with docs on `Opts::logdir`.
const EXIT_BAD_LOGDIR: i32 = 8;
const EXIT_FAILED_TO_BIND: i32 = 9;

#[tokio::main]
pub async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let opts = Opts::parse();
    init_logging(match opts.verbosity {
        0 => LevelFilter::Warn,
        1 => LevelFilter::Info,
        _ => LevelFilter::max(),
    });
    debug!("Parsed options: {:?}", opts);
    let data_location = opts.logdir.display().to_string();

    let error_file_path = opts.error_file.as_ref().map(PathBuf::as_ref);

    let reflection = tonic_reflection::server::Builder::configure()
        .register_encoded_file_descriptor_set(crate::proto::FILE_DESCRIPTOR_SET)
        .build()
        .expect("failed to create gRPC reflection servicer");

    // Create the logdir outside an async runtime (see docs for `DynLogdir::new`).
    let raw_logdir = opts.logdir;
    let logdir = tokio::task::spawn_blocking(|| DynLogdir::new(raw_logdir))
        .await?
        .unwrap_or_else(|e| {
            write_startup_error(error_file_path, &e.to_string());
            std::process::exit(EXIT_BAD_LOGDIR);
        });

    if opts.die_after_stdin {
        thread::Builder::new()
            .name("StdinWatcher".to_string())
            .spawn(die_after_stdin)
            .expect("failed to spawn stdin watcher thread");
    }

    let addr = (opts.host.as_str(), opts.port);
    let listener = TcpListener::bind(addr).await.unwrap_or_else(|e| {
        let msg = format!("failed to bind to {:?}: {}", addr, e);
        write_startup_error(error_file_path, &msg);
        std::process::exit(EXIT_FAILED_TO_BIND);
    });
    let bound = listener.local_addr()?;

    if let Some(port_file) = opts.port_file {
        let port = bound.port();
        if let Err(e) = write_port_file(&port_file, port) {
            error!(
                "Failed to write port \"{}\" to {}: {}",
                port,
                port_file.display(),
                e
            );
            std::process::exit(1);
        }
        info!("Wrote port \"{}\" to {}", port, port_file.display());
    } else {
        eprintln!("listening on {:?}", bound);
    }

    let commit = Arc::new(Commit::new());
    let psh_ref = Arc::new(opts.samples_per_plugin);
    thread::Builder::new()
        .name("Reloader".to_string())
        .spawn({
            let reload_strategy = opts.reload;
            let checksum = opts.checksum;
            let commit = Arc::clone(&commit);
            move || {
                let mut loader = LogdirLoader::new(&commit, logdir, 0, psh_ref);
                // Checksum only if `--checksum` given (i.e., off by default).
                loader.checksum(checksum);
                loop {
                    info!("Starting load cycle");
                    let start = Instant::now();
                    loader.reload();
                    let end = Instant::now();
                    info!("Finished load cycle ({:?})", end - start);
                    match reload_strategy {
                        ReloadStrategy::Loop { delay } => thread::sleep(delay),
                        ReloadStrategy::Once => break,
                    };
                }
            }
        })
        .expect("failed to spawn reloader thread");

    let handler = DataProviderHandler {
        data_location,
        commit,
    };
    Server::builder()
        .add_service(TensorBoardDataProviderServer::new(handler))
        .add_service(reflection)
        .serve_with_incoming(TcpListenerStream::new(listener))
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

/// Locks stdin and reads it to EOF, then exits the process.
fn die_after_stdin() {
    let stdin = std::io::stdin();
    let stdin_lock = stdin.lock();
    for _ in stdin_lock.bytes() {}
    info!("Stdin closed; exiting");
    std::process::exit(0);
}

/// Writes `port` to file `path` as an ASCII decimal followed by newline.
fn write_port_file(path: &Path, port: u16) -> std::io::Result<()> {
    let mut f = File::create(path)?;
    writeln!(f, "{}", port)?;
    f.flush()?;
    Ok(())
}

/// Writes error to the given file, or to stderr as a fallback.
fn write_startup_error(path: Option<&Path>, error: &str) {
    let write_to_file = |path: &Path| -> std::io::Result<()> {
        let mut f = File::create(path)?;
        writeln!(f, "{}", error)?;
        f.flush()?;
        Ok(())
    };
    if let Some(p) = path {
        if let Err(e) = write_to_file(p) {
            info!("Failed to write error to {:?}: {}", p, e);
        } else {
            return;
        }
    }
    // fall back to stderr if no path given or if write failed
    eprintln!("fatal: {}", error);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_reload() {
        assert_eq!("once".parse::<ReloadStrategy>(), Ok(ReloadStrategy::Once));
        assert_eq!(
            "5".parse::<ReloadStrategy>(),
            Ok(ReloadStrategy::Loop {
                delay: Duration::from_secs(5)
            })
        );
        "5s".parse::<ReloadStrategy>()
            .expect_err("explicit \"s\" trailer should be forbidden");
    }
}
