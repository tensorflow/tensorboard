package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "plugins",
    srcs = [
        "plugins.component.ts",
        "plugins.module.ts",
    ],
    assets = [
        "plugins.component.css",
        "plugins.component.html",
    ],
    deps = [
        "//tensorboard/components/tf_ng_tensorboard/core",
        "//tensorboard/components/tf_ng_tensorboard/types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "plugins_component_test_lib",
    testonly = True,
    srcs = [
        "plugins.component.test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":plugins",
        "//tensorboard/components/tf_ng_tensorboard/angular:expect_angular_core_testing",
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
