load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "testing",
    testonly = True,
    srcs = [
        "index.ts",
    ],
    deps = [
        "//tensorboard/webapp/plugins:plugin_registry",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)
