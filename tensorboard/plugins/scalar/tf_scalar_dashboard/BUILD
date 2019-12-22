load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_scalar_dashboard",
    srcs = [
        "tf-scalar-dashboard.ts",
        "tf-smoothing-input.ts",
    ],
    visibility = ["//visibility:public"],
    deps = [
        ":tf_scalar_card",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_categorization_utils",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_paginated_view",
        "//tensorboard/components/tf_runs_selector",
        "//tensorboard/components/tf_storage",
        "//tensorboard/components/tf_utils",
        "//tensorboard/components/vz_chart_helpers",
        "@npm//@polymer/decorators",
        "@npm//@polymer/paper-button",
        "@npm//@polymer/paper-checkbox",
        "@npm//@polymer/paper-dropdown-menu",
        "@npm//@polymer/paper-input",
        "@npm//@polymer/paper-item",
        "@npm//@polymer/paper-listbox",
        "@npm//@polymer/paper-slider",
        "@npm//@polymer/polymer",
        "@npm//@types/lodash",
        "@npm//lodash",
    ],
)

tf_ts_library(
    name = "tf_scalar_card",
    srcs = [
        "tf-scalar-card.ts",
    ],
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_card_heading",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_line_chart_data_loader",
        "//tensorboard/components/tf_utils",
        "//tensorboard/components/vz_chart_helpers",
        "//tensorboard/components/vz_line_chart2",
        "@npm//@polymer/decorators",
        "@npm//@polymer/paper-dropdown-menu",
        "@npm//@polymer/paper-icon-button",
        "@npm//@polymer/paper-item",
        "@npm//@polymer/paper-listbox",
        "@npm//@polymer/paper-menu-button",
        "@npm//@polymer/polymer",
    ],
)
