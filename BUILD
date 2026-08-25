load("@aspect_rules_ts//ts:defs.bzl", rules_ts_config = "ts_config")
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

# rules_ts uses its own TsConfigInfo provider. Keep these targets separate from
# the legacy @bazel/typescript configuration during the incremental migration.
rules_ts_config(
    name = "tsconfig-rules-ts",
    src = "tsconfig.json",
    visibility = ["//tensorboard:internal"],
)

rules_ts_config(
    name = "tsconfig-lax-rules-ts",
    src = "tsconfig-lax.json",
    visibility = ["//tensorboard:internal"],
)
