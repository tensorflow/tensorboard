load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

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
        "worker_pool_test.ts",
    ],
    deps = [
        ":worker",
        ":worker_pool",
        "@npm//@types/jasmine",
    ],
)
