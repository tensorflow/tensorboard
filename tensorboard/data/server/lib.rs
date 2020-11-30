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

//! Core functionality for TensorBoard data loading.

#![allow(clippy::needless_update)] // https://github.com/rust-lang/rust-clippy/issues/6323

pub mod commit;
pub mod data_compat;
pub mod downsample;
pub mod event_file;
pub mod logdir;
pub mod masked_crc;
pub mod reservoir;
pub mod run;
pub mod server;
pub mod tf_record;
pub mod types;

#[cfg(test)]
mod scripted_reader;

#[cfg(test)]
mod writer;

/// Protocol buffer bindings.
#[allow(clippy::all)]
pub mod proto {
    /// Bindings for `package demo`, used for a demo Tonic server.
    pub mod demo {
        include!("demo.pb.rs");
    }
    /// Bindings for `package tensorboard`, containing standard TensorFlow protos.
    pub mod tensorboard {
        include!("tensorboard.pb.rs");
        /// Bindings for `package tensorboard.data`, containing the data provider API.
        pub mod data {
            include!("tensorboard.data.pb.rs");
        }
    }
}
