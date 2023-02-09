load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "metric_arithmetic_component_styles",
    src = "metric_arithmetic_component.scss",
    strict_deps = False,
    deps = ["//tensorboard/webapp/theme"],
)

tf_ng_module(
    name = "metric_arithmetic",
    srcs = [
        "metric_arithmetic_component.ts",
        "metric_arithmetic_container.ts",
        "metric_arithmetic_module.ts",
    ],
    assets = [
        ":metric_arithmetic_component_styles",
        "metric_arithmetic_component.ng.html",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_material_chips",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/views/data_selection/metric_arithmetic/metric_arithmetic_element",
        "//tensorboard/webapp/plugins/npmi/views/data_selection/metric_arithmetic/metric_arithmetic_operator",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "metric_arithmetic_test_lib",
    testonly = True,
    srcs = [
        "metric_arithmetic_test.ts",
    ],
    deps = [
        ":metric_arithmetic",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/testing",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
