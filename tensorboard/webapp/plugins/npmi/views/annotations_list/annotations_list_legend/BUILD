load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_sass_binary(
    name = "annotations_list_legend_component_styles",
    src = "annotations_list_legend_component.scss",
)

ng_module(
    name = "annotations_list_legend",
    srcs = [
        "annotations_list_legend_component.ts",
        "annotations_list_legend_module.ts",
    ],
    assets = [
        "annotations_list_legend_component.ng.html",
        ":annotations_list_legend_component_styles",
    ],
    deps = [
        "//tensorboard/webapp/plugins/npmi/views/annotations_list/annotations_list_legend/legend_element",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "annotations_list_legend_test_lib",
    testonly = True,
    srcs = [
        "annotations_list_legend_test.ts",
    ],
    deps = [
        ":annotations_list_legend",
        "//tensorboard/webapp/core/testing",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
