load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

licenses(["notice"])

tf_ts_library(
    name = "initialize_testbed",
    srcs = [
        "initialize_testbed.ts",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_dynamic_testing",
        "@npm//@angular/localize",
    ],
)

tf_ng_module(
    name = "mat_icon",
    srcs = [
        "mat_icon_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/angular:expect_angular_material_icon_testing",
        "@npm//@angular/core",
    ],
)

tf_ng_module(
    name = "dom",
    srcs = [
        "dom.ts",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "lang",
    srcs = [
        "lang.ts",
    ],
)

tf_ng_module(
    name = "material",
    srcs = [
        "material.ts",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "utils",
    srcs = [
        "utils.ts",
    ],
    deps = [
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/testing",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/alert/store:testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/app_routing/store:testing",
        "//tensorboard/webapp/app_routing/store:types",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/experiments/store:testing",
        "//tensorboard/webapp/experiments/store:types",
        "//tensorboard/webapp/feature_flag/store:testing",
        "//tensorboard/webapp/feature_flag/store:types",
        "//tensorboard/webapp/hparams/_redux:testing",
        "//tensorboard/webapp/hparams/_redux:types",
        "//tensorboard/webapp/metrics:test_lib",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/notification_center/_redux:testing",
        "//tensorboard/webapp/notification_center/_redux:types",
        "//tensorboard/webapp/persistent_settings/_redux:testing",
        "//tensorboard/webapp/runs/store:testing",
        "//tensorboard/webapp/runs/store:types",
        "//tensorboard/webapp/settings:testing",
        "@npm//@ngrx/store",
    ],
)

tf_ng_module(
    name = "integration_test_module",
    srcs = [
        "integration_test_module.ts",
    ],
    deps = [
        ":mat_icon",
        "//tensorboard/webapp:reducer_config",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_dynamic_testing",
        "//tensorboard/webapp/app_routing",
        "//tensorboard/webapp/app_routing:route_config",
        "//tensorboard/webapp/app_routing:route_registry",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/core",
        "//tensorboard/webapp/deeplink:testing",
        "//tensorboard/webapp/feature_flag",
        "//tensorboard/webapp/runs",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
    ],
)
