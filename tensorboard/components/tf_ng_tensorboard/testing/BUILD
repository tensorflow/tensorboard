package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tf_ts_library")

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
        "@npm//@angular/core",
        "@npm//@angular/platform-browser-dynamic",
    ],
)
