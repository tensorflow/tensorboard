package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")

ng_module(
    name = "core",
    srcs = [
        "core.actions.ts",
        "core.module.ts",
        "core.reducers.ts",
    ],
    deps = [
        "//tensorboard/components/tf_ng_tensorboard/types",
        "@npm//@ngrx/store",
    ],
)
