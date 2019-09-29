package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

ng_module(
    name = "storage",
    srcs = [
        "storage.component.ts",
        "storage.module.ts",
    ],
    deps = [
        "//tensorboard/components/tf_ng_tensorboard/core",
        "//tensorboard/components/tf_ng_tensorboard/polymer_interop",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "test_lib",
    testonly = True,
    srcs = [
        "storage.component.test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":storage",
        "//tensorboard/components/tf_ng_tensorboard/angular:expect_angular_core_testing",
        "//tensorboard/components/tf_ng_tensorboard/core",
        "//tensorboard/components/tf_ng_tensorboard/core/testing",
        "//tensorboard/components/tf_ng_tensorboard/polymer_interop",
        "@npm//@angular/common",
        "@npm//@angular/compiler",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
