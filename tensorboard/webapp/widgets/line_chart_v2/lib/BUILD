load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ts_library(
    name = "types",
    srcs = [
        "scale_types.ts",
        "types.ts",
    ],
)

tf_ts_library(
    name = "worker_pool",
    srcs = ["worker_pool.ts"],
    deps = [
        ":worker",
    ],
)

tf_ts_library(
    name = "coordinator",
    srcs = [
        "coordinator.ts",
        "threejs_coordinator.ts",
    ],
    deps = [
        ":scale",
        ":types",
        ":utils",
        "@npm//three",
    ],
)

tf_ts_library(
    name = "worker",
    srcs = ["worker.ts"],
    visibility = ["//visibility:private"],
)

tf_ts_library(
    name = "scale",
    srcs = [
        "scale.ts",
    ],
    deps = [
        ":types",
        "@npm//@types/d3",
        "@npm//d3",
    ],
)

tf_ts_library(
    name = "utils",
    srcs = [
        "utils.ts",
    ],
    deps = [
        ":types",
    ],
)

tf_ts_library(
    name = "lib_tests",
    testonly = True,
    srcs = [
        "coordinator_test.ts",
        "scale_test.ts",
        "worker_pool_test.ts",
    ],
    deps = [
        ":coordinator",
        ":scale",
        ":types",
        ":worker",
        ":worker_pool",
        "@npm//@types/jasmine",
    ],
)
