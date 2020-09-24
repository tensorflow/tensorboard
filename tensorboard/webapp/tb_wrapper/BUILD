load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

ng_module(
    name = "tb_wrapper",
    srcs = [
        "tb_wrapper_component.ts",
        "tb_wrapper_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/plugins",
        "//tensorboard/webapp/reloader",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)
