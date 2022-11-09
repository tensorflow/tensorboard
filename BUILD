load("@npm//@bazel/typescript:index.bzl", "ts_config")

licenses(["notice"])

exports_files(["tsconfig.json"])

# Inspired from internal tsconfig generation for project like TensorBoard.
ts_config(
    name = "tsconfig-lax",
    src = "tsconfig-lax.json",
    visibility = [
        "//tensorboard:internal",
    ],
    deps = [],
)
