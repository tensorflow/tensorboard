load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

licenses(["notice"])

filegroup(
    name = "test_support_lib",
    srcs = [
        ":rxjs_shims.js",
        "@npm//:node_modules/rxjs/dist/bundles/rxjs.umd.js",
        "@npm//:node_modules/tslib/tslib.js",
    ],
)

tf_ts_library(
    name = "initialize_testbed",
    srcs = [
        "initialize_testbed.ts",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_dynamic_testing",
    ],
)

tf_ng_module(
    name = "mat_icon",
    srcs = [
        "mat_icon_module.ts",
    ],
    deps = [
        "@npm//@angular/core",
    ],
)

tf_ng_module(
    name = "dom",
    srcs = [
        "dom.ts",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "lang",
    srcs = [
        "lang.ts",
    ],
)

tf_ng_module(
    name = "material",
    srcs = [
        "material.ts",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "@npm//@angular/core",
    ],
)

exports_files(["require_js_karma_config.js"])
