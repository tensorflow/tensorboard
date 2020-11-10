load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "data_source",
    srcs = [
        "index.ts",
        "metrics_data_source.ts",
        "metrics_data_source_module.ts",
    ],
    deps = [
        ":backend_types",
        ":types",
        "//tensorboard/webapp/webapp_data_source:http_client",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "types.ts",
    ],
    deps = [
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "backend_types",
    srcs = [
        "metrics_backend_types.ts",
    ],
    visibility = ["//visibility:private"],
    deps = [
        ":types",
    ],
)

tf_ts_library(
    name = "metrics_data_source_test",
    testonly = True,
    srcs = [
        "metrics_data_source_test.ts",
    ],
    deps = [
        ":backend_types",
        ":data_source",
        ":types",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/webapp_data_source:http_client_testing",
        "@npm//@types/jasmine",
    ],
)
