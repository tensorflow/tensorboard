package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tf_ts_library")

licenses(["notice"])

filegroup(
    name = "test_support_lib",
    srcs = [
        ":rxjs_shims.js",
        "@npm//:node_modules/rxjs/bundles/rxjs.umd.js",
        "@npm//:node_modules/tslib/tslib.js",
    ],
)

tf_ts_library(
    name = "initialize_testbed",
    testonly = 1,
    srcs = [
        "initialize_testbed.ts",
    ],
    deps = [
        "//tensorboard/components/tf_ng_tensorboard/angular:expect_angular_core_testing",
        "//tensorboard/components/tf_ng_tensorboard/angular:expect_angular_platform_browser_dynamic_testing",
    ],
)
