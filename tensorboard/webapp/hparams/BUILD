load("//tensorboard/defs:defs.bzl", "tf_ng_web_test_suite", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "types",
    srcs = [
        "types.ts",
    ],
    deps = ["//tensorboard/webapp/runs/data_source"],
)

tf_ng_web_test_suite(
    name = "karma_test",
    deps = [
        "//tensorboard/webapp/hparams/_redux:_redux_test_lib",
    ],
)
