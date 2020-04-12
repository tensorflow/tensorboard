package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "source_files",
    srcs = [
        "source_files_component.ts",
        "source_files_container.ts",
        "source_files_module.ts",
    ],
    assets = [
        "source_files_component.css",
        "source_files_component.ng.html",
    ],
    deps = [
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store:types",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/source_code",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "source_files_container_test_lib",
    testonly = True,
    srcs = [
        "source_files_container_test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":source_files",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin:debugger_v2",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store:types",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/testing",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/alerts",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/execution_data",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/graph_executions",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/inactive",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/source_code:load_monaco",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/source_code:testing",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/stack_trace",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/timeline",
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
