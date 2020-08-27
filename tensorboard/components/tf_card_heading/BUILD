load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_card_heading",
    srcs = [
        "tf-card-heading.ts",
        "tf-card-heading-style.ts",
        "util.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components/polymer:irons_and_papers",
        "//tensorboard/components/polymer:register_style_dom_module",
        "//tensorboard/components/tf_markdown_view",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)
