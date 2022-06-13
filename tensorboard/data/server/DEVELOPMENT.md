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

## Running under TensorBoard

You can point TensorBoard at a data server in two ways: start the server
yourself and give TensorBoard an address, or tell TensorBoard to start the
server as a subprocess.

To connect to an existing server, pass `--grpc_data_provider ADDRESS`, where the
address is like `localhost:6806`. Thus:

```
bazel run -c opt //tensorboard -- --grpc_data_provider localhost:6806
```

You don’t have to pass a `--logdir` if you do this, but you do have to
concurrently run `//tensorboard/data/server` (say, in the background, or in a
separate shell). You can also swap out the data server whenever you want without
restarting TensorBoard; new RPCs will transparently reconnect. This can be
useful in conjunction with `ibazel` to restart the server when you make changes.
The server doesn’t have to be running when TensorBoard starts.

To tell TensorBoard to start the server as a subprocess, build with
`--define=link_data_server=true` and pass `--load_fast=true` to TensorBoard
along with a normal `--logdir`. Thus:

```
bazel run -c opt --define=link_data_server=true //tensorboard -- \
    --load_fast --logdir ~/tensorboard_data/mnist/ --bind_all --verbosity 0
```

This is an easier one-shot solution. You can use `ibazel` here, too; changes to
the Rust code will cause both the Rust server and Python TensorBoard to restart
(the latter a bit spuriously, but it’s not really a problem). The downsides are
that it requires a `--define` flag, offers less flexibility over the flags to
the data server, and requires restarting TensorBoard if you want to restart the
data server. The data server will automatically shut down when TensorBoard exits
for any reason.

As an alternative to `--define=link_data_server=true`, you can set the
`TENSORBOARD_DATA_SERVER_BINARY` environment variable to the path to a data
server binary, and pass `--load_fast=true`. If running with `bazel run`, this
should be an absolute path.

As another alternative, you can install the `tensorboard_data_server` package
into your virtualenv. To do so, run:

```
bazel run -c opt //tensorboard/data/server/pip_package:install
```

and then run TensorBoard with `--load_fast`. You’ll need to re-generate and
re-install the Pip package each time that you update the Rust binary.

With `--load_fast`, the order of precedence for the different binary locations
is:

-   an explicit `TENSORBOARD_DATA_SERVER_BINARY` environment variable is honored
    if present and non-empty; else
-   the `tensorboard_data_server` package is queried if it is installed; else
-   the server bundled with `--define=link_data_server=true` is used.

## Adding or updating third-party dependencies

Rust dependencies are usually hosted on [crates.io]. We use [`cargo-raze`][raze]
to automatically generate Bazel build files for these third-party dependencies.

The source of truth for `cargo-raze` is the `Cargo.toml` file. To add a new
dependency or modify an existing dependency:

1.  Run `cargo install cargo-raze` to ensure that you have [`cargo-raze`][raze]
    installed.
2.  Add or modify an entry in the `[dependencies]` section of `Cargo.toml`.
    The new line should look like `rand = "0.7.3"`. You can find the most recent
    version of a package on <https://crates.io/>.
3.  Change into the `tensorboard/data/server/` directory.
4.  For new dependencies, run `cargo fetch` to update `Cargo.lock`. For updated
    dependencies, run `cargo update -p <dependency name>` to update
    `Cargo.lock`. Running these before `cargo raze` ensures that the
    `http_archive` workspace rules in the generated build files will have
    `sha256` checksums.
4.  Cross reference the updates in `Cargo.lock` with crate-specific metadata in
    `Cargo.toml`. For each section of type `[raze.crates.CRATE-NAME.VERSION]`
    in `Cargo.toml`, see if the `Cargo.lock` file now refers to a more recent
    version and make the corresponding updates to `Cargo.toml`.
5.  Run `cargo raze` to update `third_party/rust/...`. This will add or update a
    target like `//tensorboard/data/server/cargo:rand`.
6.  Manually build the crate with Bazel to ensure that it works:
    `bazel build //tensorboard/data/server/cargo:rand`. If the build fails, you
    likely need to teach `cargo-raze` how to handle this package by adding new
    crate-specific metadata to a `[raze.crates.CRATE-NAME.VERSION]` section of
    the `Cargo.toml` file and running `cargo raze` again.

    Failure modes may include:

    -   The package uses a `build.rs` script to generate code at compile time.
        Solution: add `gen_buildrs = true`.
    -   The package needs certain features to be enabled. Solution: add
        `additional_flags = ["--cfg=FEATURE_NAME"]`.

    See `Cargo.toml` for prior art. Googlers: you may be able to glean some hints
    from the corresponding Google-internal build files.
7.  Run `bazel test tensorboard/data/server:update_protos_test` to determine if
    the proto source files need to be updated. If this test fails then its logs
    will contain instructions on how to update the protos.

When done, commit the changes to `Cargo.toml`, `Cargo.lock`, and the
`third_party/rust/` directory.

[crates.io]: https://crates.io/
[raze]: https://github.com/google/cargo-raze

## Test data

Test datasets are stored on Google Cloud Storage in the world-readable
`gs://tensorboard-bench-logs` bucket, whose [bucket README] is online. To run
against this data, use `gsutil` to copy it to your local machine.

[bucket README]: https://storage.googleapis.com/tensorboard-bench-logs/README

## `grpc_cli` development tips

RustBoard implements a gRPC server. The [`grpc_cli`] tool can be handy for
sending ad hoc requests to the server. To use the tool, make sure that a
RustBoard server is running (`bazel run -c opt //tensorboard/data/server`),
change into the root directory for the TensorBoard repository, and run:

```
grpc_cli \
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

## Style

Google has no official Rust style guide. In lieu of an exhaustive list of rules,
we offer the following advice:

-   There is an official [Rust API Guidelines Checklist][cklist]. (Don’t miss
    all the prose behind the items, and see also the “External links”
    reference.) This can sometimes be helpful to answer questions like, “how
    should I name this method?” or “should I validate this invariant, and, if
    so, how?”. The standard library and toolchains are also great references for
    questions of documentation, interfaces, or implementation: you can always
    just ”go see what `String` does”.

    These sources provide _guidelines_. Our code can probably afford to be less
    completely documented than the standard library.

-   Listen to Clippy and bias toward taking its advice. It’s okay to disable
    lints by using `#[allow(clippy::some_lint_name)]`: preferably on just a
    single item (rather than a module), and preferably with a brief comment.

-   Standard correctness guidelines: prefer making it structurally impossible to
    panic (avoid `unwrap`/`expect` when possible); use newtypes and visibility
    to enforce invariants where appropriate; do not use `unsafe` unless you have
    a good reason that you are prepared to justify; etc.

-   Write Rust code that will still compile if backward-compatible changes are
    made to protobuf definitions whose source of truth is not in this repo
    (i.e., those updated by `tensorboard/compat/proto/update.sh`). This means:

    -   When you construct a protobuf message, spread in `Default::default` even
        if you populate all the fields, in case more fields are added:

        ```rust
        let plugin_data = pb::summary_metadata::PluginData {
            plugin_name: String::from("scalars"),
            content: Vec::new(),
            ..Default::default()
        };
        ```

        This [contradicts `clippy::needless_update`][clippy-nu], so we disable
        that lint at the crate level.

    -   When you consume a protobuf enum, include a default case:

        ```rust
        let class_name = match data_class {
            DataClass::Scalar => "scalar",
            DataClass::Tensor => "tensor",
            DataClass::BlobSequence => "blob sequence",
            _ => "unknown", // matching against `_`, not `DataClass::Unknown`
        };
        ```

    This way, whoever is updating our copies of the protobuf definitions doesn’t
    also have to context-switch in to updating Rust code. This rule doesn’t
    apply to `tensorboard.data` protos, since we own those.

    We don’t have a compile-time check for this, so just try to be careful.

    If you’re reading this because a protobuf change _has_ caused Rust failures,
    here are some tips for fixing them:

    -   For struct initializers: add `..Default::default()` (no trailing comma),
        as in the example above.
    -   For `match` expressions: add a `_ => unimplemented!()` branch, as in the
        example above, which will panic at runtime if it’s hit.
    -   For other contexts: if there’s not an obvious fix, run `git blame` and
        ask the original author, or ask another Rust developer.

[cklist]: https://rust-lang.github.io/api-guidelines/checklist.html
[clippy-nu]: https://github.com/rust-lang/rust-clippy/issues/6323

When in doubt, you can always ask a colleague or the internet. Stack Overflow
responses on Rust tend to be both fast and helpful, especially for carefully
posed questions.
