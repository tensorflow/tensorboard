load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_sass_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_sass_binary(
    name = "metric_arithmetic_component_styles",
    src = "metric_arithmetic_component.scss",
)

ng_module(
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
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/views/data_selection/metric_arithmetic/metric_arithmetic_element",
        "//tensorboard/webapp/plugins/npmi/views/data_selection/metric_arithmetic/metric_arithmetic_operator",
        "@npm//@angular/core",
        "@npm//@angular/material",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)
