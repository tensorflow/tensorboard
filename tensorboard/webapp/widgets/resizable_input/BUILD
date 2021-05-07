load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "resizable_input",
    srcs = [
        "resizable_input_component.ts",
        "resizable_input_module.ts",
    ],
    deps = [
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "resizable_input_tests",
    testonly = True,
    srcs = [
        "resizable_input_test.ts",
    ],
    deps = [
        ":resizable_input",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/testing:dom",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
