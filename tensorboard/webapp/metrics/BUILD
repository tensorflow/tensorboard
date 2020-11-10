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
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/effects",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/metrics/views",
        "//tensorboard/webapp/plugins:plugin_registry",
        "//tensorboard/webapp/runs/views/runs_selector",
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
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/widgets/histogram:types",
        "//tensorboard/webapp/widgets/line_chart",
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
        "//tensorboard/webapp/widgets/histogram:types",
        "@npm//@angular/core",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
