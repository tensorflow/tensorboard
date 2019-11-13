package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "plugins",
    srcs = [
        "plugins.container.ts",
        "plugins.module.ts",
    ],
    deps = [
        "//tensorboard/webapp/core",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "plugins_container_test_lib",
    testonly = True,
    srcs = [
        "plugins.container.test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":plugins",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/core",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//@angular/compiler",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
