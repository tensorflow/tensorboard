# Using Rust in TensorBoard

## Building

The `//tensorboard/data/server` package can be built with Bazel. It builds
hermetically and with no additional setup. If you like using `bazel build`,
`bazel run`, and `bazel test`, you can stop reading now.

This package can also be built with Cargo, the standard Rust toolchain. You
might want to use Cargo:

-   …to use the `rust-analyzer` language server in your editor of choice.
-   …to use tools like `cargo clippy` (a linter) or `cargo geiger` (an auditor
    for unsafe code) or `cargo tree` (to show the crate dependency graph).
-   …to use `cargo raze` to generate Bazel build files from the Cargo package
    structure.
-   …to use other Rust toolchains, like the beta or nightly channels.
-   …to cross-compile.
-   …simply because you’re more familiar with it or prefer it.

The easiest way to get and use Cargo is with <https://rustup.rs>. Cargo resolves
subcommands by looking for executables called `cargo-*` (analogous to Git), so
you may want to `cargo install cargo-raze cargo-watch cargo-geiger` for some
useful tools.

To build with Cargo, change into the `tensorboard/data/server/` directory and
use standard Cargo commands, like `cargo build --release` or `cargo test`.
Running `cargo raze` from within `tensorboard/data/server/` will update the
build files under `third_party/rust/`, using `Cargo.toml` as the source of
truth.

You should be able to use `rust-analyzer` without doing anything special or
changing into the `tensorboard/data/server/` subdirectory: just open one of the
Rust source files in your editor. For editor setup, consult
[the `rust-analyzer` docs][ra-docs].

[ra-docs]: https://rust-analyzer.github.io/

## Adding third-party dependencies

Rust dependencies are usually hosted on [crates.io]. We use [`cargo-raze`][raze]
to automatically generate Bazel build files for these third-party dependencies.

The source of truth for `cargo-raze` is the `Cargo.toml` file. To add a new
dependency:

1.  Run `cargo install cargo-raze` to ensure that you have [`cargo-raze`][raze]
    installed.
2.  Add an entry to the `[dependencies]` section of `Cargo.toml`. The new line
    should look like `rand = "0.7.3"`. You can find the most recent version of a
    package on <https://crates.io/>.
3.  Change into the `tensorboard/data/server/` directory.
4.  Run `cargo fetch` to update `Cargo.lock`. Running this before `cargo raze`
    ensures that the `http_archive` workspace rules in the generated build
    files will have `sha256` checksums.
5.  Run `cargo raze` to update `third_party/rust/...`.

This will add a new target like `//third_party/rust:rand`. Manually build it
with Bazel to ensure that it works: `bazel build //third_party/rust:rand`. If
the build fails, you’ll need to teach `cargo-raze` how to handle this package by
adding crate-specific metadata to a `[raze.crates.CRATE-NAME.VERSION]` section
of the `Cargo.toml` file. Failure modes may include:

-   The package uses a `build.rs` script to generate code at compile time.
    Solution: add `gen_buildrs = true`.
-   The package needs certain features to be enabled. Solution: add
    `additional_flags = ["--cfg=FEATURE_NAME"]`.

See `Cargo.toml` for prior art. Googlers: you may be able to glean some hints
from the corresponding Google-internal build files.

When done, commit the changes to `Cargo.toml`, `Cargo.lock`, and the
`third_party/rust/` directory.

[crates.io]: https://crates.io/
[raze]: https://github.com/google/cargo-raze

## `grpc_cli` development tips

RustBoard implements a gRPC server. The [`grpc_cli`] tool can be handy for
sending ad hoc requests to the server. To use the tool, make sure that a
RustBoard server is running (`bazel run -c opt //tensorboard/data/server`),
change into the root directory for the TensorBoard repository, and run:

```
grpc_cli \
    --channel_creds_type=insecure \
    --protofiles tensorboard/data/proto/data_provider.proto \
    call localhost:6806 \
    TensorBoardDataProvider.ListScalars '
        experiment_id: "123"
        plugin_filter { plugin_name: "scalars" }
    '
```

The `localhost:6806` argument should point to your running server. The
`ListScalars` identifier should name the RPC method that you want to invoke. And
the quoted string is the text format encoding of the request message.

You should know:

-   The Tonic framework does not yet support gRPC reflection, so you need to
    specify the `--protofiles` argument, and the `grpc_cli ls` subcommand will
    not work. This is [under development in Prost and Tonic][reflection].

-   You should be in the root directory of the repository to refer to the
    `.proto` file, because it imports other protos under `tensorboard/compat/`
    via relative path. If you really want to run at non-root, try setting
    `--proto-path` to the path to the root repository (keep `--protofiles` as a
    path relative to that directory).

-   If your `grpc_cli` invocation fails because the response size is too large,
    apply the following patch and rebuild `grpc_cli`:

    ```diff
    diff --git a/test/cpp/util/grpc_tool.cc b/test/cpp/util/grpc_tool.cc
    index fceee0c82b..443d419c6e 100644
    --- a/test/cpp/util/grpc_tool.cc
    +++ b/test/cpp/util/grpc_tool.cc
    @@ -226,6 +226,7 @@ void ReadResponse(CliCall* call, const std::string& method_name,
     std::shared_ptr<grpc::Channel> CreateCliChannel(
         const std::string& server_address, const CliCredentials& cred) {
       grpc::ChannelArguments args;
    +  args.SetMaxReceiveMessageSize(1024 * 1024 * 256);
       if (!cred.GetSslTargetNameOverride().empty()) {
         args.SetSslTargetNameOverride(cred.GetSslTargetNameOverride());
       }
    ```

    If you want to not have to do this, upvote [grpc/grpc#24734].

-   Googlers: use the open-source build of `grpc_cli`, not the Google-internal
    one.

[`grpc_cli`]: https://github.com/grpc/grpc/blob/master/doc/command_line_tool.md
[grpc/grpc#24734]: https://github.com/grpc/grpc/issues/24374
[reflection]: https://github.com/hyperium/tonic/pull/340
