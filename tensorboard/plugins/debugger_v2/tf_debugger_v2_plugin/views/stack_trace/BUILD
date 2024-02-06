load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "stack_trace_styles",
    src = "stack_trace_component.scss",
    deps = [
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/common:style_lib",
        "//tensorboard/webapp/theme",
    ],
)

tf_ng_module(
    name = "stack_trace",
    srcs = [
        "stack_trace_component.ts",
        "stack_trace_container.ts",
        "stack_trace_module.ts",
    ],
    assets = [
        ":stack_trace_styles",
        "stack_trace_component.ng.html",
    ],
    deps = [
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/actions",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store:types",
        "//tensorboard/webapp/widgets/source_code",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "stack_trace_container_test_lib",
    testonly = True,
    srcs = [
        "stack_trace_container_test.ts",
    ],
    deps = [
        ":stack_trace",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin:debugger_v2",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/actions",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store:types",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/testing",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
