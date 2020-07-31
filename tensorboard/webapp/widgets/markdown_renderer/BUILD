load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "markdown_renderer",
    srcs = [
        "markdown_renderer_component.ts",
        "markdown_renderer_module.ts",
    ],
    assets = [
        "markdown_renderer_component.css",
        "markdown_renderer_component.ng.html",
    ],
    deps = [
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@types/marked",
        "@npm//marked",
    ],
)
