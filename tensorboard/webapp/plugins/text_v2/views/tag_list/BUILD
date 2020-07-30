load("@npm_angular_bazel//:index.bzl", "ng_module")
#load("//tensorboard/defs:defs.bzl", "tf_ng_web_test_suite", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "tag_list",
    srcs = [
        "tag_list_component.ts",
        "tag_list_container.ts",
        "tag_list_module.ts",
    ],
    assets = [
        "tag_list.css",
        "tag_list.ng.html",
    ],
    deps = [
        "//tensorboard/webapp/plugins/text_v2/views/tag_group",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)

