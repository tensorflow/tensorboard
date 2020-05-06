package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "graph",
    srcs = [
        "graph_component.ts",
        "graph_container.ts",
        "graph_module.ts",
    ],
    assets = [
        "graph_component.css",
        "graph_component.ng.html",
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
