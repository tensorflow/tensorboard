load("@npm_angular_bazel//:index.bzl", "ng_module")
#load("//tensorboard/defs:defs.bzl", "tf_ng_web_test_suite", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "tag",
    srcs = [
        "tag_component.ts",
        "tag_module.ts",
    ],
    assets = [
        "tag.css",
        "tag.ng.html",
    ],
    deps = [
        "//tensorboard/webapp/plugins/text_v2/views/step",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)
