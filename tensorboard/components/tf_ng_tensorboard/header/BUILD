package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "header",
    srcs = [
        "components/header.component.ts",
        "containers/header.component.ts",
        "header.module.ts",
    ],
    assets = [
        "components/header.component.css",
        "components/header.component.html",
    ],
    deps = [
        "//tensorboard/components/tf_ng_tensorboard/angular:expect_angular_material_select",
        "//tensorboard/components/tf_ng_tensorboard/angular:expect_angular_material_tabs",
        "//tensorboard/components/tf_ng_tensorboard/angular:expect_angular_material_toolbar",
        "//tensorboard/components/tf_ng_tensorboard/core",
        "//tensorboard/components/tf_ng_tensorboard/types",
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
        "header.test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":header",
        "//tensorboard/components/tf_ng_tensorboard/angular:expect_angular_core_testing",
        "//tensorboard/components/tf_ng_tensorboard/angular:expect_angular_material_select",
        "//tensorboard/components/tf_ng_tensorboard/angular:expect_angular_material_tabs",
        "//tensorboard/components/tf_ng_tensorboard/angular:expect_angular_material_toolbar",
        "//tensorboard/components/tf_ng_tensorboard/angular:expect_angular_platform_browser_animations",
        "//tensorboard/components/tf_ng_tensorboard/core",
        "//tensorboard/components/tf_ng_tensorboard/core/testing",
        "//tensorboard/components/tf_ng_tensorboard/types",
        "@npm//@angular/common",
        "@npm//@angular/compiler",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
