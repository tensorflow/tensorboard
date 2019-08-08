package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_js_binary")
load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_ng_tensorboard",
    srcs = [
        ":tf_ng_tensorboard_binary.js",
        "@npm//:node_modules/zone.js/dist/zone.js",
    ],
    path = "/tf-ng-tensorboard",
    deps = [
        ":tf_ng_tensorboard_binary",
    ],
)

tf_js_binary(
    name = "tf_ng_tensorboard_binary",
    compile = 1,
    entry_point = ":main.js",
    deps = [
        ":ng_main",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@angular/router",
        "@npm//rxjs",
        "@npm//zone.js",
    ],
)

ng_module(
    name = "ng_main",
    srcs = [
        "main.js",
    ],
    deps = [
        ":app",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@angular/router",
        "@npm//zone.js",
    ],
)

ng_module(
    name = "app",
    srcs = [
        "app.component.js",
        "app.module.js",
        "app-routing.module.js",
    ],
    assets = [
        "app.component.css",
        "app.component.html",
    ],
    deps = [
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@angular/router",
    ],
)
