load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "intersection_observer",
    srcs = [
        "intersection_observer_directive.ts",
        "intersection_observer_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_cdk_scrolling",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "intersection_observer_test",
    testonly = True,
    srcs = [
        "intersection_observer_test.ts",
    ],
    deps = [
        ":intersection_observer",
        "//tensorboard/webapp/angular:expect_angular_cdk_scrolling",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "@npm//@angular/core",
        "@npm//@types/jasmine",
    ],
)

tf_ng_module(
    name = "intersection_observer_testing",
    testonly = True,
    srcs = [
        "intersection_observer_testing_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
    ],
)
