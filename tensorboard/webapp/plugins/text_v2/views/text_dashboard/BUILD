load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

ng_module(
    name = "text_dashboard",
    srcs = [
        "text_dashboard_component.ts",
        "text_dashboard_module.ts",
    ],
    deps = [
        "@npm//@angular/core",
    ],
)
