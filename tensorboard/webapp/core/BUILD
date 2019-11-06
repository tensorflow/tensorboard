package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("@npm_bazel_jasmine//:index.bzl", "jasmine_node_test")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

ng_module(
    name = "core",
    srcs = [
        "core.module.ts",
    ],
    deps = [
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/effects",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/angular:expect_angular_common_http",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/webapp_data_source",
        "@npm//@angular/common",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)
