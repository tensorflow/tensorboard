package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tf_ts_library")

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "load_monaco",
    srcs = [
        "load_monaco_shim.ts",
    ],
    deps = [
        "@npm//@types/requirejs",
    ]
)

tf_ts_library(
    name = "source_code_test_lib",
    testonly = True,
    srcs = [
        "load_monaco_shim_test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":load_monaco",
        "@npm//@types/jasmine",
        "@npm//@types/requirejs",
    ],
)
