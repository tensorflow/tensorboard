load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "histogram",
    srcs = [
        "histogram_component.ts",
        "histogram_module.ts",
    ],
    deps = [
        ":types",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "histogram_test",
    testonly = True,
    srcs = [
        "histogram_test.ts",
        "histogram_util_test.ts",
    ],
    deps = [
        ":histogram",
        ":types",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "@npm//@angular/core",
        "@npm//@types/jasmine",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "histogram_types.ts",
        "histogram_util.ts",
    ],
)
