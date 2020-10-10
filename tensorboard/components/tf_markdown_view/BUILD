load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_markdown_view",
    srcs = ["tf-markdown-view.ts"],
    strict_checks = False,
    deps = [
        ":sanitize",
        "//tensorboard/components/polymer:legacy_element_mixin",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)

tf_ts_library(
    name = "sanitize",
    srcs = ["sanitize.ts"],
)
