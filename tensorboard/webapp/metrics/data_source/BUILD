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
        "//tensorboard/webapp/feature_flag",
        "//tensorboard/webapp/feature_flag/store",
        "//tensorboard/webapp/feature_flag/store:types",
        "//tensorboard/webapp/metrics:internal_types",
        "//tensorboard/webapp/webapp_data_source:http_client",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "card_interactions_data_source",
    srcs = [
        "card_interactions_data_source.ts",
        "card_interactions_data_source_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/metrics/store:types",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "types.ts",
    ],
    deps = [
        "//tensorboard/webapp/metrics:internal_types",
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
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/feature_flag:testing",
        "//tensorboard/webapp/metrics:internal_types",
        "//tensorboard/webapp/testing:utils",
        "//tensorboard/webapp/webapp_data_source:http_client_testing",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "card_interactions_data_source_test",
    testonly = True,
    srcs = [
        "card_interactions_data_source_test.ts",
    ],
    deps = [
        ":card_interactions_data_source",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/metrics:internal_types",
        "@npm//@types/jasmine",
    ],
)
