package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "stack_trace",
    srcs = [
        "stack_trace_component.ts",
        "stack_trace_container.ts",
        "stack_trace_module.ts",
    ],
    assets = [
        "stack_trace_component.css",
        "stack_trace_component.ng.html",
    ],
    deps = [
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/actions",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store:types",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/source_code",
        "//tensorboard/webapp/angular:expect_angular_material_slide_toggle",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)
