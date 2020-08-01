load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_text_dashboard",
    srcs = [
        "tf-text-dashboard.ts",
        "tf-text-loader.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components_polymer3/polymer:legacy_element_mixin",
        "//tensorboard/components_polymer3/tf_backend",
        "//tensorboard/components_polymer3/tf_card_heading",
        "//tensorboard/components_polymer3/tf_categorization_utils",
        "//tensorboard/components_polymer3/tf_color_scale",
        "//tensorboard/components_polymer3/tf_dashboard_common",
        "//tensorboard/components_polymer3/tf_markdown_view",
        "//tensorboard/components_polymer3/tf_paginated_view",
        "//tensorboard/components_polymer3/tf_runs_selector",
        "@npm//@polymer/decorators",
        "@npm//@polymer/iron-icon",
        "@npm//@polymer/paper-dialog",
        "@npm//@polymer/paper-icon-button",
        "@npm//@polymer/paper-input",
        "@npm//@polymer/paper-material",
        "@npm//@polymer/paper-slider",
        "@npm//@polymer/paper-spinner",
        "@npm//@polymer/polymer",
        "@npm//@types/d3",
        "@npm//@types/lodash",
        "@npm//d3",
        "@npm//lodash",
    ],
)
