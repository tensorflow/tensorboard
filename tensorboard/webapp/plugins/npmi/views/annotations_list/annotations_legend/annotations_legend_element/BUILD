load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_sass_binary(
    name = "annotations_legend_element_component_styles",
    src = "annotations_legend_element_component.scss",
)

ng_module(
    name = "annotations_legend_element",
    srcs = [
        "annotations_legend_element_component.ts",
        "annotations_legend_element_module.ts",
    ],
    assets = [
        "annotations_legend_element_component.ng.html",
        ":annotations_legend_element_component_styles",
    ],
    deps = [
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//@types/d3",
        "@npm//d3",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "annotations_legend_element_test_lib",
    testonly = True,
    srcs = [
        "annotations_legend_element_test.ts",
    ],
    deps = [
        ":annotations_legend_element",
        "//tensorboard/webapp/core/testing",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
