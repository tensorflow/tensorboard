load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "routes",
    srcs = [
        "index.ts",
    ],
    deps = [
        ":dashboard_deeplink_provider",
        "//tensorboard/webapp/app_routing:route_config",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/feature_flag/views",
        "//tensorboard/webapp/tb_wrapper",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "dashboard_deeplink_provider_types",
    srcs = [
        "dashboard_deeplink_provider_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/runs:types",
    ],
)

tf_ts_library(
    name = "dashboard_deeplink_provider",
    srcs = [
        "dashboard_deeplink_provider.ts",
    ],
    deps = [
        ":dashboard_deeplink_provider_types",
        ":feature_flag_serializer",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/app_routing:deep_link_provider",
        "//tensorboard/webapp/app_routing:route_config",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/data_source:types",
        "//tensorboard/webapp/runs:types",
        "//tensorboard/webapp/tb_wrapper",
        "//tensorboard/webapp/webapp_data_source:feature_flag_types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "feature_flag_serializer",
    srcs = [
        "feature_flag_serializer.ts",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/app_routing:location",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/webapp_data_source:feature_flag_query_parameters",
        "//tensorboard/webapp/webapp_data_source:feature_flag_types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
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
        ":dashboard_deeplink_provider_types",
    ],
)

tf_ts_library(
    name = "routes_test_lib",
    testonly = True,
    srcs = [
        "dashboard_deeplink_provider_test.ts",
        "feature_flag_serializer_test.ts",
    ],
    deps = [
        ":dashboard_deeplink_provider",
        ":feature_flag_serializer",
        ":testing",
        "//tensorboard/webapp/app_routing:location",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/app_routing:deep_link_provider",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/metrics:test_lib",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/data_source:types",
        "//tensorboard/webapp/runs:types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
