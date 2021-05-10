load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

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
        "//tensorboard/webapp/third_party:marked",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "markdown_renderer_tests",
    testonly = True,
    srcs = [
        "markdown_renderer_component_test.ts",
    ],
    deps = [
        ":markdown_renderer",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@types/jasmine",
    ],
)
