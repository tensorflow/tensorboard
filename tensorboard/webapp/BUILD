package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_js_binary", "tf_ng_web_test_suite", "tf_ts_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")

licenses(["notice"])  # Apache 2.0

# The app component
tf_js_binary(
    name = "tb_webapp_binary",
    compile = 1,
    entry_point = select({
        "//tensorboard:dev_build": ":main.ts",
        "//conditions:default": "main.prod.ts",
    }),
    deps = [
        ":ng_main",
        "//tensorboard/webapp/angular:expect_angular_material_tabs",
        "//tensorboard/webapp/angular:expect_angular_material_toolbar",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/material",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//rxjs",
        "@npm//zone.js",
    ],
)

# the app component as a library
tf_web_library(
    name = "tb_webapp",
    srcs = [
        ":tb_webapp_binary.js",
    ],
    path = "/tb-webapp",
    deps = [
        ":tb_webapp_binary",
    ],
)

# the complete app, including the polymer stuff
tf_web_library(
    name = "tensorboard-webapp",
    srcs = [
        "index.html",
    ],
    path = "/",
    deps = [
        "//tensorboard/components:ng_polymer_lib_binary",
        ":tb_webapp",
        "//tensorboard/webapp:material_theme",
    ],
)

# html binary for the complete app
tensorboard_html_binary(
    name = "ng_index",
    input_path = "/index.html",
    output_path = "/ng_index.html",
    deps = [":tensorboard-webapp"],
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
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/core",
        "//tensorboard/webapp/header",
        "//tensorboard/webapp/plugins",
        "//tensorboard/webapp/reloader",
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
        "//tensorboard/webapp/core:core_effects_test_lib",
        "//tensorboard/webapp/header:test_lib",
        "//tensorboard/webapp/plugins:plugins_container_test_lib",
        "//tensorboard/webapp/reloader:test_lib",
        "//tensorboard/webapp/settings:test_lib",
    ],
)
