load("@io_bazel_rules_rust//rust:rust.bzl", "rust_binary", "rust_doc", "rust_doc_test", "rust_library", "rust_test")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

# Protocol buffer packages (as in `package foo.bar;` directives) that we need
# to compile to Rust bindings.
_proto_packages = [
    "tensorboard",
    "tensorboard.data",
]

# Generated files with Rust protobuf bindings. These only exist in the build
# graph, not in the source tree. The file name pattern is specified by Prost
# and must match the output of `prost_build`.
_genproto_files = ["genproto/%s.rs" % pkg for pkg in _proto_packages]

# Source files with Rust protobuf bindings. These are automatically
# materialized in the source tree from the generated bindings by the
# `:update_protos` script, and kept in sync via `:update_protos_test`. These
# don't match the raw generated code exactly: e.g., we add license headers.
_checked_in_proto_files = ["%s.pb.rs" % pkg for pkg in _proto_packages]

rust_library(
    name = "rustboard_core",
    srcs = [
        "lib.rs",
        "blob_key.rs",
        "cli.rs",
        "commit.rs",
        "data_compat.rs",
        "downsample.rs",
        "event_file.rs",
        "logdir.rs",
        "masked_crc.rs",
        "reservoir.rs",
        "run.rs",
        "scripted_reader.rs",
        "server.rs",
        "tf_record.rs",
        "types.rs",
        "writer.rs",
    ] + _checked_in_proto_files,
    edition = "2018",
    deps = [
        "//tensorboard/data/server/cargo:async_stream",
        "//tensorboard/data/server/cargo:base64",
        "//tensorboard/data/server/cargo:byteorder",
        "//tensorboard/data/server/cargo:clap",
        "//tensorboard/data/server/cargo:crc",
        "//tensorboard/data/server/cargo:env_logger",
        "//tensorboard/data/server/cargo:futures_core",
        "//tensorboard/data/server/cargo:log",
        "//tensorboard/data/server/cargo:prost",
        "//tensorboard/data/server/cargo:rand",
        "//tensorboard/data/server/cargo:rand_chacha",
        "//tensorboard/data/server/cargo:rayon",
        "//tensorboard/data/server/cargo:serde",
        "//tensorboard/data/server/cargo:serde_json",
        "//tensorboard/data/server/cargo:thiserror",
        "//tensorboard/data/server/cargo:tokio",
        "//tensorboard/data/server/cargo:tokio_stream",
        "//tensorboard/data/server/cargo:tonic",
        "//tensorboard/data/server/cargo:walkdir",
    ],
)

rust_test(
    name = "rustboard_core_test",
    crate = ":rustboard_core",
    deps = [
        "//tensorboard/data/server/cargo:tempfile",
    ],
)

rust_binary(
    name = "bench",
    srcs = ["bench.rs"],
    edition = "2018",
    deps = [
        ":rustboard_core",
        "//tensorboard/data/server/cargo:clap",
        "//tensorboard/data/server/cargo:env_logger",
        "//tensorboard/data/server/cargo:log",
        "//tensorboard/data/server/cargo:rayon",
    ],
)

rust_doc_test(
    name = "rustboard_core_doc_test",
    dep = ":rustboard_core",
)

rust_doc(
    name = "rustboard_core_doc",
    dep = ":rustboard_core",
)

py_binary(
    name = "rustboard_core_doc_server",
    srcs = ["rustboard_core_doc_server.py"],
    data = [":rustboard_core_doc.zip"],
    python_version = "PY3",
    srcs_version = "PY3",
    deps = [
        "@org_pocoo_werkzeug",
    ],
)

rust_binary(
    name = "server",
    srcs = ["main.rs"],
    edition = "2018",
    deps = [
        ":rustboard_core",
    ],
)

genrule(
    name = "gen_protos",
    srcs = [
        "//tensorboard/compat/proto:proto_srcs",
        "//tensorboard/data/proto:proto_srcs",
        "//tensorboard/plugins/audio:proto_srcs",
        "//tensorboard/plugins/image:proto_srcs",
    ],
    outs = _genproto_files,
    cmd = "$(execpath :gen_protos_tool) $(RULEDIR)",
    tools = [
        ":gen_protos_tool",
        "@com_google_protobuf//:protoc",
    ],
)

rust_binary(
    name = "gen_protos_tool",
    srcs = ["gen_protos_tool.rs"],
    edition = "2018",
    visibility = ["//visibility:private"],
    deps = [
        "//tensorboard/data/server/cargo:tonic_build",
    ],
)

py_binary(
    name = "update_protos",
    srcs = ["update_protos.py"],
    args = ["--update"] + _proto_packages,
    data = _genproto_files,
    python_version = "PY3",
    srcs_version = "PY3",
)

py_test(
    name = "update_protos_test",
    srcs = ["update_protos.py"],
    args = ["--check"] + _proto_packages,
    data = _genproto_files + glob(_checked_in_proto_files),
    main = "update_protos.py",
    python_version = "PY3",
    srcs_version = "PY3",
)
