load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_image_dashboard",
    srcs = [
        "tf-image-dashboard.ts",
        "tf-image-loader.ts",
    ],
    strict_checks = False,
    path = "/tf-image-dashboard",
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_card_heading",
        "//tensorboard/components/tf_categorization_utils",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_paginated_view",
        "//tensorboard/components/tf_runs_selector",
        "//tensorboard/components/tf_tensorboard:registry",
        "@npm//@polymer/iron-icon",
        "@npm//@polymer/paper-button",
        "@npm//@polymer/paper-dialog",
        "@npm//@polymer/paper-icon-button",
        "@npm//@polymer/paper-input",
        "@npm//@polymer/paper-slider",
        "@npm//@polymer/paper-spinner",
        "@npm//@types/lodash",
        "@npm//lodash",
    ],
)
