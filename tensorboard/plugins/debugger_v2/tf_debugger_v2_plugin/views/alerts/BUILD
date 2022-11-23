load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "alerts",
    srcs = [
        "alerts_component.ts",
        "alerts_container.ts",
        "alerts_module.ts",
    ],
    assets = [
        "alerts_component.css",
        "alerts_component.ng.html",
    ],
    deps = [
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/actions",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store:types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "alerts_container_test_lib",
    testonly = True,
    srcs = [
        "alerts_container_test.ts",
    ],
    deps = [
        ":alerts",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin:debugger_v2",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/actions",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store:types",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/testing",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/execution_data",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/graph_executions",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/inactive",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/source_files",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/stack_trace",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/timeline",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
