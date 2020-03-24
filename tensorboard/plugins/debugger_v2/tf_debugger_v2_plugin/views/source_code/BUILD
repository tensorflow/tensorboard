package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "source_code",
    srcs = [
        "source_code_component.ts",
        "source_code_module.ts",
    ],
    assets = [
        "source_code_component.css",
        "source_code_component.ng.html",
    ],
    deps = [
        ":load_monaco",
        # TODO(cais): Clean up.
        # "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin:tf_types",
        # "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/actions",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store:types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "load_monaco",
    srcs = [
        "load_monaco_shim.ts",
    ],
    deps = [
        "@npm//@types/requirejs",
    ],
)

tf_ts_library(
    name = "source_code_test_lib",
    testonly = True,
    srcs = [
        "load_monaco_shim_test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":load_monaco",
        "@npm//@types/jasmine",
        "@npm//@types/requirejs",
    ],
)
