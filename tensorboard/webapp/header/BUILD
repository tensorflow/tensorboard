package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "header",
    srcs = [
        "header_container.ts",
        "header_component.ts",
        "header_module.ts",
        "types.ts",
    ],
    assets = [
        "header_component.css",
        "header_component.ng.html",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_material_select",
        "//tensorboard/webapp/angular:expect_angular_material_tabs",
        "//tensorboard/webapp/angular:expect_angular_material_toolbar",
        "//tensorboard/webapp/core",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/settings",
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "test_lib",
    testonly = True,
    srcs = [
        "header_test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":header",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_select",
        "//tensorboard/webapp/angular:expect_angular_material_tabs",
        "//tensorboard/webapp/angular:expect_angular_material_toolbar",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/settings",
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//@angular/compiler",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
