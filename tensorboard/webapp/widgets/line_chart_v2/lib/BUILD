load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ts_library(
    name = "worker_allocator",
    srcs = ["worker_allocator.ts"],
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
    name = "worker_allocator_test",
    testonly = True,
    srcs = [
        "worker_allocator_test.ts",
    ],
    deps = [
        ":worker",
        ":worker_allocator",
        "@npm//@types/jasmine",
    ],
)
