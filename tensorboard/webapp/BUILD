package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_js_binary", "tf_ng_web_test_suite", "tf_ts_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")

licenses(["notice"])  # Apache 2.0

# Angular module for the top-level app component together with all of its
# injectable dependencies.  I.e., the entire Angular app.
ng_module(
    name = "app",
    srcs = [
        "app_container.ts",
        "app_module.ts",
        "reducer_config.ts",
    ],
    assets = [
        "app_container.css",
        "app_container.ng.html",
    ],
    deps = [
        ":config",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/core",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/header",
        "//tensorboard/webapp/plugins",
        "//tensorboard/webapp/reloader",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "config",
    srcs = [
        "config_dev.ts",
        "config_prod.ts",
    ],
)

# Wrapper that prepares Angular app for deployment, dealing with browser
# compatibility, Vulcanization, and configuration (e.g. prod vs. dev).
ng_module(
    name = "ng_main",
    srcs = ["bootstrap.ts"] + select({
        "//tensorboard:dev_build": ["main.ts"],
        "//conditions:default": ["main_prod.ts"],
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

# Compile the prepared Angular app to a JS binary.
tf_js_binary(
    name = "tb_webapp_binary",
    compile = 1,
    entry_point = select({
        "//tensorboard:dev_build": ":main.ts",
        "//conditions:default": "main_prod.ts",
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

# Wrap the Angular app JS binary as a library.
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

tf_web_library(
    name = "material_theme",
    srcs = [
        "@npm//:node_modules/@angular/material/prebuilt-themes/indigo-pink.css",
    ],
    path = "/@angular",
    strip_prefix = "node_modules/@angular/material/prebuilt-themes",
)

# Bundle the Angular app with the Polymer components and plugins, as a library.
tf_web_library(
    name = "tensorboard-webapp",
    srcs = [
        "index.html",
    ],
    path = "/",
    deps = [
        ":tb_webapp",
        "//tensorboard/components:ng_polymer_lib_binary",
        "//tensorboard/webapp:material_theme",
    ],
)

# A Vulcanized html binary for the complete app (both Angular and Polymer parts)
tensorboard_html_binary(
    name = "ng_index",
    input_path = "/index.html",
    output_path = "/ng_index.html",
    js_path = "/ng_index.js",
    deps = [":tensorboard-webapp"],
)

# Karma has overhead of bootstrap/tearDown. Combine as much testcases
# as possible into one test target and use test sharding to speed up.
tf_ng_web_test_suite(
    name = "karma_test",
    deps = [
        "//tensorboard/webapp/core/effects:core_effects_test_lib",
        "//tensorboard/webapp/core/store:core_store_test_lib",
        "//tensorboard/webapp/header:test_lib",
        "//tensorboard/webapp/plugins:plugins_container_test_lib",
        "//tensorboard/webapp/reloader:test_lib",
        "//tensorboard/webapp/settings:test_lib",
    ],
)
