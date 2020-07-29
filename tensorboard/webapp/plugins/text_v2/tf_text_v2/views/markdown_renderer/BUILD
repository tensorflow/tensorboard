load("@npm_angular_bazel//:index.bzl", "ng_module")
#load("//tensorboard/defs:defs.bzl", "tf_ng_web_test_suite", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "markdown_renderer",
    srcs = [
        "markdown_renderer_component.ts",
        "markdown_renderer_module.ts",
    ],
    assets = [
        "markdown_renderer.css",
        "markdown_renderer.ng.html",
    ],
    deps = [
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)

