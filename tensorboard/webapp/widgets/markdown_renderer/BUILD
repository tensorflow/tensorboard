load("//tensorboard/defs:defs.bzl", "tf_ng_module")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
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
