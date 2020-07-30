load("@npm_angular_bazel//:index.bzl", "ng_module")
#load("//tensorboard/defs:defs.bzl", "tf_ng_web_test_suite", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "step",
    srcs = [
        "step_component.ts",
        "step_module.ts",
    ],
    assets = [
        "step.css",
        "step.ng.html",
    ],
    deps = [
        "//tensorboard/webapp/plugins/text_v2/tf_text_v2/views/markdown_renderer:markdown_renderer",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/material",
    ],
)


