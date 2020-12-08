load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "metric_arithmetic_operator",
    srcs = [
        "metric_arithmetic_operator_component.ts",
        "metric_arithmetic_operator_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_material_chips",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "metric_arithmetic_operator_test_lib",
    testonly = True,
    srcs = [
        "metric_arithmetic_operator_test.ts",
    ],
    deps = [
        ":metric_arithmetic_operator",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
