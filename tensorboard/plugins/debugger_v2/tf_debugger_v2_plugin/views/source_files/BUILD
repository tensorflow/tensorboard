package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")

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
