load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_sass_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_sass_binary(
    name = "parallel_coordinates_component_styles",
    src = "parallel_coordinates_component.scss",
)

ng_module(
    name = "parallel_coordinates",
    srcs = [
        "parallel_coordinates_component.ts",
        "parallel_coordinates_container.ts",
        "parallel_coordinates_module.ts",
    ],
    assets = [
        "parallel_coordinates_component.ng.html",
        ":parallel_coordinates_component_styles",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/util:coordinate_data",
        "@npm//@angular/core",
        "@npm//@angular/material",
        "@npm//@ngrx/store",
        "@npm//@types/d3",
        "@npm//d3",
        "@npm//rxjs",
    ],
)
