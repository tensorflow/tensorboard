load("//tensorbored/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorbored:internal"])

licenses(["notice"])

tf_ng_module(
    name = "persist_resize",
    srcs = [
        "persist_resize_directive.ts",
        "persist_resize_module.ts",
    ],
    deps = [
        "@npm//@angular/core",
        "@npm//@types/resize-observer-browser",
        "@npm//rxjs",
    ],
)

tf_ng_module(
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
        "//tensorbored/webapp/angular:expect_angular_core_testing",
        "@npm//@angular/core",
        "@npm//@types/jasmine",
        "@npm//@types/resize-observer-browser",
    ],
)

tf_ng_module(
    name = "resize_detector_testing",
    testonly = True,
    srcs = [
        "resize_detector_testing_module.ts",
    ],
    deps = [
        "//tensorbored/webapp/angular:expect_angular_core_testing",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
    ],
)
