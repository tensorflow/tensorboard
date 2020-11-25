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

fn main() -> std::io::Result<()> {
    let rule_dir = PathBuf::from(
        std::env::args_os()
            .nth(1)
            .expect("must give output dir as first arg"),
    );
    let out_dir = {
        let mut dir = rule_dir;
        dir.push("genproto");
        dir
    };
    tonic_build::configure()
        .out_dir(&out_dir)
        .format(false) // don't run `rustfmt`; shouldn't be needed to build
        .compile(
            &[
                "tensorboard/compat/proto/event.proto",
                "tensorboard/data/proto/data_provider.proto",
                "tensorboard/data/server/demo.proto",
            ],
            &["."],
        )
        .expect("compile_protos");
    Ok(())
}
