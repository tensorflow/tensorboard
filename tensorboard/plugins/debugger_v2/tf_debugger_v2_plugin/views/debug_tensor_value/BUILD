package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "debug_tensor_value",
    srcs = [
        "debug_tensor_value_component.ts",
        "debug_tensor_value_module.ts",
    ],
    deps = [
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store:debug_tensor_value",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store:types",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "debug_tensor_value_component_test_lib",
    testonly = True,
    srcs = [
        "debug_tensor_value_component_test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":debug_tensor_value",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store:debug_tensor_value",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store:types",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "@npm//@angular/common",
        "@npm//@angular/compiler",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
