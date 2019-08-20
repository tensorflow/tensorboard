package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("@npm_bazel_jasmine//:index.bzl", "jasmine_node_test")

ng_module(
    name = "core",
    srcs = [
        "core.actions.js",
        "core.module.js",
        "core.reducers.js",
    ],
    deps = [
        "//tensorboard/components/tf_ng_tensorboard/types",
        "@npm//@ngrx/store",
    ],
)

ng_module(
    name = "core_test_lib",
    testonly = True,
    srcs = [
        "core.reducers.test.ts",
    ],
    deps = [
        ":core",
        "@npm//@types/jasmine",
        "@npm//chai",
    ],
)

jasmine_node_test(
    name = "core_jasmine_test",
    deps = [
        ":core_test_lib",
    ],
)
