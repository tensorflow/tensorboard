load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_custom_scalar_dashboard",
    srcs = [
        "tf-custom-scalar-card-style.ts",
        "tf-custom-scalar-dashboard.ts",
        "tf-custom-scalar-helpers.ts",
        "tf-custom-scalar-margin-chart-card.ts",
        "tf-custom-scalar-multi-line-chart-card.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components_polymer3/polymer:dom-repeat",
        "//tensorboard/components_polymer3/polymer:irons_and_papers",
        "//tensorboard/components_polymer3/polymer:legacy_element_mixin",
        "//tensorboard/components_polymer3/polymer:register_style_dom_module",
        "//tensorboard/components_polymer3/tf_backend",
        "//tensorboard/components_polymer3/tf_card_heading",
        "//tensorboard/components_polymer3/tf_categorization_utils",
        "//tensorboard/components_polymer3/tf_color_scale",
        "//tensorboard/components_polymer3/tf_dashboard_common",
        "//tensorboard/components_polymer3/tf_line_chart_data_loader",
        "//tensorboard/components_polymer3/tf_paginated_view",
        "//tensorboard/components_polymer3/tf_runs_selector",
        "//tensorboard/components_polymer3/tf_storage",
        "//tensorboard/components_polymer3/tf_utils",
        "//tensorboard/components_polymer3/vz_chart_helpers",
        "//tensorboard/plugins/scalar/polymer3/tf_scalar_dashboard:tf_smoothing_input",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/lodash",
        "@npm//lodash",
        "@npm//plottable",
    ],
)
