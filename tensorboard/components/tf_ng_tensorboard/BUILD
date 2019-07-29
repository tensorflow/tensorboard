package(default_visibility = ["//tensorboard:internal"])

load("@build_bazel_rules_nodejs//:defs.bzl", "rollup_bundle")
load("@npm_angular_bazel//:index.bzl", "ng_module")
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
        ":tf_ng_tensorboard_binary"
    ],
)

rollup_bundle(
    name = "tf_ng_tensorboard_binary",
    entry_point = ":main.ts",
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
        "main.ts"
    ],
    deps = [
        ":app",
        "@npm//@angular/core",
        "@npm//@angular/router",
        "@npm//@angular/platform-browser",
        "@npm//zone.js",
    ],
)

ng_module(
    name = "app",
    srcs = [
        "app-routing.module.ts",
        "app.module.ts",
        "app.component.ts",
    ],
    assets = [
        "app.component.css",
        "app.component.html",
    ],
    deps = [
        "@npm//@angular/core",
        "@npm//@angular/router",
        "@npm//@angular/platform-browser",
    ],
)
