package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")

ng_module(
    name = "core",
    srcs = [
        "core.module.ts",
    ],
    deps = [
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/effects",
        "//tensorboard/webapp/core/store",
        "@npm//@angular/core",
    ],
)
