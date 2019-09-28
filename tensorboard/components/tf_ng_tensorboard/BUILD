package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_js_binary", "tf_ng_web_test_suite", "tf_ts_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_ng_tensorboard",
    srcs = [
        ":tf_ng_tensorboard_binary.js",
    ],
    path = "/tf-ng-tensorboard",
    deps = [
        ":tf_ng_tensorboard_binary",
    ],
)

# TODO(stephanwlee): move this to root level
tf_web_library(
    name = "material_theme",
    srcs = [
        "@npm//:node_modules/@angular/material/prebuilt-themes/indigo-pink.css",
    ],
    path = "/@angular",
    strip_prefix = "node_modules/@angular/material/prebuilt-themes",
)

tf_js_binary(
    name = "tf_ng_tensorboard_binary",
    compile = 1,
    entry_point = select({
        "//tensorboard:dev_build": ":main.ts",
        "//conditions:default": "main.prod.ts",
    }),
    deps = [
        ":ng_main",
        "//tensorboard/components/tf_ng_tensorboard/angular:expect_angular_material_tabs",
        "//tensorboard/components/tf_ng_tensorboard/angular:expect_angular_material_toolbar",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/material",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//rxjs",
        "@npm//zone.js",
    ],
)

tf_ts_library(
    name = "config",
    srcs = [
        "config.dev.ts",
        "config.prod.ts",
    ],
)

ng_module(
    name = "ng_main",
    srcs = ["bootstrap.ts"] + select({
        "//tensorboard:dev_build": ["main.ts"],
        "//conditions:default": ["main.prod.ts"],
    }),
    deps = [
        ":app",
        ":config",
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
        "reducers.ts",
    ],
    assets = [
        "app.component.css",
        "app.component.html",
    ],
    deps = [
        ":config",
        "//tensorboard/components/tf_ng_tensorboard/angular:expect_angular_platform_browser_animations",
        "//tensorboard/components/tf_ng_tensorboard/core",
        "//tensorboard/components/tf_ng_tensorboard/header",
        "//tensorboard/components/tf_ng_tensorboard/plugins",
        "//tensorboard/components/tf_ng_tensorboard/reloader",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
    ],
)

# Karma has overhead of bootstrap/tearDown. Combine as much testcases
# as possible into one test target and use test sharding to speed up.
tf_ng_web_test_suite(
    name = "karma_test",
    deps = [
        "//tensorboard/components/tf_ng_tensorboard/core:core_effects_test_lib",
        "//tensorboard/components/tf_ng_tensorboard/header:test_lib",
        "//tensorboard/components/tf_ng_tensorboard/plugins:plugins_component_test_lib",
        "//tensorboard/components/tf_ng_tensorboard/reloader:test_lib",
    ],
)
