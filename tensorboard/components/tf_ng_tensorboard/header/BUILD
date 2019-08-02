package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "header",
    srcs = [
        "containers/header.component.ts",
        "header.module.ts",
    ],
    assets = [
        "containers/header.component.css",
        "containers/header.component.html",
    ],
    deps = [
        "//tensorboard/components/tf_ng_tensorboard/core",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/material",
        "@npm//@ngrx/store",
    ],
)
