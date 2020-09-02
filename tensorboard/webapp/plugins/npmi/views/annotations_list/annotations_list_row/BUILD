load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_sass_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_sass_binary(
    name = "annotations_list_row_component_styles",
    src = "annotations_list_row_component.scss",
)

ng_module(
    name = "annotations_list_row",
    srcs = [
        "annotations_list_row_component.ts",
        "annotations_list_row_container.ts",
        "annotations_list_row_module.ts",
    ],
    assets = [
        "annotations_list_row_component.ng.html",
        ":annotations_list_row_component_styles",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/util:metric_type",
        "//tensorboard/webapp/plugins/npmi/util:number_format",
        "@npm//@angular/core",
        "@npm//@angular/material",
        "@npm//@ngrx/store",
        "@npm//@types/d3",
        "@npm//d3",
        "@npm//rxjs",
    ],
)
