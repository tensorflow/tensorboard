load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

ng_module(
    name = "data_source",
    srcs = [
        "tfdbg2_data_source.ts",
        "tfdbg2_data_source_module.ts",
    ],
    deps = [
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store:types",
        "//tensorboard/webapp/webapp_data_source:http_client",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)
