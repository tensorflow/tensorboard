package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_js_binary")

licenses(["notice"])  # Apache 2.0


tf_js_binary(
    name = "tf_ng_tensorboard_binary",
    compile = 1,
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
        "main.ts",
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
        "app.component.ts",
        "app.module.ts",
        "app-routing.module.ts",
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
