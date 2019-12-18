load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_card_heading",
    srcs = [
        "tf-card-heading.ts",
        "tf-card-heading-style.ts",
        "util.ts",
    ],
    deps = [
        "//tensorboard/components/tf_markdown_view",
        "@npm//@polymer/decorators",
        "@npm//@polymer/paper-dialog",
        "@npm//@polymer/paper-dialog-scrollable",
        "@npm//@polymer/paper-icon-button",
        "@npm//@polymer/polymer",
    ],
)
