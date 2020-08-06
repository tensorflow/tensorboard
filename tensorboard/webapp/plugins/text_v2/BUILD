load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "text_v2",
    srcs = [
        "text_v2_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/plugins:plugin_registry",
        "//tensorboard/webapp/plugins/text_v2/views/text_dashboard",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)
