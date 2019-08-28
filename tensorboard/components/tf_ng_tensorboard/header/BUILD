package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("@npm_bazel_typescript//:index.bzl", "ts_library")

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "header",
    srcs = [
        "containers/header.component.ts",
        "header.module.js",
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

ts_library(
    name = "test_lib",
    testonly = True,
    srcs = [
        "containers/header.component.test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":header",
        "//tensorboard/components/tf_ng_tensorboard/core",
        "//tensorboard/components/tf_ng_tensorboard/core:test_util",
        "@npm//@angular/common",
        "@npm//@angular/compiler",
        "@npm//@angular/core",
        "@npm//@angular/material",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
