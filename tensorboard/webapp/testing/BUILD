load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

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
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_dynamic_testing",
    ],
)

ng_module(
    name = "mat_icon",
    testonly = 1,
    srcs = [
        "mat_icon.module.ts",
    ],
    deps = [
        "@npm//@angular/core",
    ],
)
