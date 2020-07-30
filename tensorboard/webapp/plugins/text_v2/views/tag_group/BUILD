load("@npm_angular_bazel//:index.bzl", "ng_module")
#load("//tensorboard/defs:defs.bzl", "tf_ng_web_test_suite", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "tag_group",
    srcs = [
        "tag_group_component.ts",
        "tag_group_module.ts",
    ],
    assets = [
        "tag_group.css",
        "tag_group.ng.html",
    ],
    deps = [
        "//tensorboard/webapp/plugins/text_v2/views/tag",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)
