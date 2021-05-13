load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "_data_source",
    srcs = [
        "index.ts",
        "notification_center_data_source.ts",
        "notification_center_data_source_module.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/notification_center/_redux:types",
        "//tensorboard/webapp/webapp_data_source:http_client",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "backend_types.ts",
    ],
    deps = [
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "testing",
    testonly = True,
    srcs = [
        "testing.ts",
    ],
    deps = [
        ":_data_source",
        ":types",
        "//tensorboard/webapp/notification_center/_redux:types",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "_data_source_test",
    testonly = True,
    srcs = [
        "notification_center_data_source_test.ts",
    ],
    deps = [
        ":_data_source",
        ":testing",
        ":types",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/webapp_data_source:http_client",
        "//tensorboard/webapp/webapp_data_source:http_client_testing",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
