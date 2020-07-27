load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_sass_binary(
    name = "npmi_component_styles",
    src = "npmi_component.scss",
)

ng_module(
    name = "npmi",
    srcs = [
        "npmi_component.ts",
        "npmi_container.ts",
        "npmi_module.ts",
    ],
    assets = [
        ":npmi_component_styles",
        "npmi_component.ng.html",
    ],
    deps = [
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/plugins:plugin_registry",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "npmi_test_lib",
    testonly = True,
    srcs = [
        "npmi_container_test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":npmi",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "@npm//@angular/common",
        "@npm//@angular/compiler",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
