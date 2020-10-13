load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ts_library(
    name = "types",
    srcs = ["types.ts"],
)

tf_ts_library(
    name = "layout",
    srcs = [
        "composite_layout.ts",
        "flex_layout.ts",
        "layout.ts",
    ],
    deps = [":types"],
)

tf_ts_library(
    name = "worker_pool",
    srcs = ["worker_pool.ts"],
    deps = [
        ":worker",
    ],
)

tf_ts_library(
    name = "worker",
    srcs = ["worker.ts"],
    visibility = ["//visibility:private"],
)

tf_ts_library(
    name = "lib_tests",
    testonly = True,
    srcs = [
        "layout_test.ts",
        "worker_pool_test.ts",
    ],
    deps = [
        ":layout",
        ":types",
        ":worker",
        ":worker_pool",
        "@npm//@types/jasmine",
    ],
)
