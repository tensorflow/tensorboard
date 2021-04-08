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
        "//tensorboard/webapp/notification_center/_redux:types",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "backend_types",
    srcs = [
        "notification_center_backend_types.ts",
    ],
    visibility = ["//visibility:private"],
    deps = [
        ":types",
        "//tensorboard/webapp/notification_center/_redux:types",
    ],
)
