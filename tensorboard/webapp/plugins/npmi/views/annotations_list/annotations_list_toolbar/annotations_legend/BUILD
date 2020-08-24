load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_sass_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_sass_binary(
    name = "annotations_legend_component_styles",
    src = "annotations_legend_component.scss",
)

ng_module(
    name = "annotations_legend",
    srcs = [
        "annotations_legend_component.ts",
        "annotations_legend_module.ts",
    ],
    assets = [
        "annotations_legend_component.ng.html",
        ":annotations_legend_component_styles",
    ],
    deps = [
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/views/annotations_list/annotations_list_toolbar/annotations_legend/annotations_legend_element",
        "@npm//@angular/core",
        "@npm//@angular/material",
        "@npm//@ngrx/store",
        "@npm//@types/d3",
        "@npm//d3",
        "@npm//rxjs",
    ],
)
