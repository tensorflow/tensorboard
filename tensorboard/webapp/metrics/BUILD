load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "metrics",
    srcs = [
        "metrics_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/alert:alert_action",
        "//tensorboard/webapp/app_routing",
        "//tensorboard/webapp/core",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/data_source:card_interactions_data_source",
        "//tensorboard/webapp/metrics/effects",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/metrics/store:metrics_initial_state_provider",
        "//tensorboard/webapp/metrics/views",
        "//tensorboard/webapp/persistent_settings:config_module",
        "//tensorboard/webapp/plugins:plugin_registry",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "types.ts",
    ],
    deps = [
        ":internal_types",
    ],
)

tf_ts_library(
    name = "internal_types",
    srcs = [
        "internal_types.ts",
    ],
    visibility = ["//tensorboard/webapp/metrics:__subpackages__"],
    deps = [
        "//tensorboard/webapp/widgets/card_fob:types",
        "//tensorboard/webapp/widgets/data_table:types",
        "//tensorboard/webapp/widgets/histogram:types",
    ],
)

tf_ts_library(
    name = "utils",
    srcs = [
        "utils.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/util:types",
    ],
)

tf_ts_library(
    name = "utils_test",
    testonly = True,
    srcs = [
        "utils_test.ts",
    ],
    deps = [
        ":utils",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/views:types",
        "@npm//@types/jasmine",
    ],
)

tf_ts_library(
    name = "test_lib",
    testonly = True,
    srcs = [
        "testing.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/metrics/store:types",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/widgets/data_table:types",
        "//tensorboard/webapp/widgets/histogram:types",
        "@npm//@angular/core",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "integration_test",
    testonly = True,
    srcs = [
        "metrics_integration_test.ts",
    ],
    deps = [
        ":metrics",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_dynamic_testing",
        "//tensorboard/webapp/metrics/store:metrics_initial_state_provider",
        "//tensorboard/webapp/metrics/store:types",
        "//tensorboard/webapp/metrics/views",
        "//tensorboard/webapp/testing:integration_test_module",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
