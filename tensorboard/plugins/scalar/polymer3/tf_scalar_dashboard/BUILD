load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_scalar_dashboard",
    srcs = ["tf-scalar-dashboard.ts"],
    strict_checks = False,
    deps = [
        ":tf_scalar_card",
        ":tf_smoothing_input",
        "//tensorboard/components_polymer3/polymer:irons_and_papers",
        "//tensorboard/components_polymer3/polymer:legacy_element_mixin",
        "//tensorboard/components_polymer3/tf_backend",
        "//tensorboard/components_polymer3/tf_categorization_utils",
        "//tensorboard/components_polymer3/tf_color_scale",
        "//tensorboard/components_polymer3/tf_dashboard_common",
        "//tensorboard/components_polymer3/tf_globals",
        "//tensorboard/components_polymer3/tf_paginated_view",
        "//tensorboard/components_polymer3/tf_runs_selector",
        "//tensorboard/components_polymer3/tf_storage",
        "//tensorboard/components_polymer3/tf_utils",
        "//tensorboard/components_polymer3/vz_chart_helpers",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/lodash",
        "@npm//lodash",
    ],
)

tf_ts_library(
    name = "tf_smoothing_input",
    srcs = ["tf-smoothing-input.ts"],
    strict_checks = False,
    deps = [
        "//tensorboard/components_polymer3/polymer:irons_and_papers",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/lodash",
        "@npm//lodash",
    ],
)

tf_ts_library(
    name = "tf_scalar_card",
    srcs = ["tf-scalar-card.ts"],
    strict_checks = False,
    deps = [
        "//tensorboard/components_polymer3/polymer:irons_and_papers",
        "//tensorboard/components_polymer3/tf_backend",
        "//tensorboard/components_polymer3/tf_card_heading",
        "//tensorboard/components_polymer3/tf_color_scale",
        "//tensorboard/components_polymer3/tf_dashboard_common",
        "//tensorboard/components_polymer3/tf_line_chart_data_loader",
        "//tensorboard/components_polymer3/vz_chart_helpers",
        "//tensorboard/components_polymer3/vz_line_chart2",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)
