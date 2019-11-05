package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("@npm_bazel_jasmine//:index.bzl", "jasmine_node_test")

ng_module(
    name = "client",
    srcs = [
        "client.module.ts",
        "client.service.ts",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_common_http",
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//rxjs",
    ],
)