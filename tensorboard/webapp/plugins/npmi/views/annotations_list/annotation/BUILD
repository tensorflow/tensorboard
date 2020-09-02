load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_sass_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_sass_binary(
    name = "annotation_component_styles",
    src = "annotation_component.scss",
)

ng_module(
    name = "annotation",
    srcs = [
        "annotation_component.ts",
        "annotation_container.ts",
        "annotation_module.ts",
    ],
    assets = [
        "annotation_component.ng.html",
        ":annotation_component_styles",
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
