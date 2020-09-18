load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

ng_module(
    name = "resize_detector",
    srcs = [
        "resize_detector_directive.ts",
        "resize_detector_module.ts",
    ],
    deps = [
        "@npm//@angular/core",
        "@npm//@types/resize-observer-browser",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "resize_detector_test",
    testonly = True,
    srcs = [
        "resize_detector_test.ts",
    ],
    deps = [
        ":resize_detector",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "@npm//@angular/core",
        "@npm//@types/jasmine",
        "@npm//@types/resize-observer-browser",
    ],
)

ng_module(
    name = "resize_detector_testing",
    testonly = True,
    srcs = [
        "resize_detector_testing_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
    ],
)
