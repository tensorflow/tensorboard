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
    strict_checks = False,
    deps = [
        "//tensorboard/components_polymer3/polymer:irons_and_papers",
        "//tensorboard/components_polymer3/polymer:register_style_dom_module",
        "//tensorboard/components_polymer3/tf_markdown_view",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)
