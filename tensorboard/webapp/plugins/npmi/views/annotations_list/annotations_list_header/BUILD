load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_sass_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_sass_binary(
    name = "annotations_list_header_component_styles",
    src = "annotations_list_header_component.scss",
)

ng_module(
    name = "annotations_list_header",
    srcs = [
        "annotations_list_header_component.ts",
        "annotations_list_header_container.ts",
        "annotations_list_header_module.ts",
    ],
    assets = [
        ":annotations_list_header_component_styles",
        "annotations_list_header_component.ng.html",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/util:metric_type",
        "@npm//@angular/core",
        "@npm//@angular/material",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)
