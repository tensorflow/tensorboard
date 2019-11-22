package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")

ng_module(
    name = "webapp_data_source",
    srcs = [
        "tb_server_data_source_module.ts",
        "tb_server_data_source.ts",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_common_http",
        "//tensorboard/webapp/types",
        "@npm//@angular/core",
        "@npm//@angular/common",
        "@npm//rxjs",
    ],
)
