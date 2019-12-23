package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tf_ts_library")

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_image_dashboard",
    srcs = [
        "tf-image-dashboard.ts",
        "tf-image-loader.ts",
    ],
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_card_heading",
        "//tensorboard/components/tf_categorization_utils",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_paginated_view",
        "//tensorboard/components/tf_runs_selector",
        "//tensorboard/components/tf_utils",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//d3",
        "@npm//@types/lodash",
        "@npm//lodash",
        "@npm//@polymer/paper-button",
        "@npm//@polymer/paper-dialog",
        "@npm//@polymer/paper-icon-button",
        "@npm//@polymer/paper-input",
        "@npm//@polymer/paper-slider",
        "@npm//@polymer/paper-spinner",
    ],
)
