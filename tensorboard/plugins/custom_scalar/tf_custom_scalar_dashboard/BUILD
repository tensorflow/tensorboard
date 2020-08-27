load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

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
        "//tensorboard/components/polymer:dom-repeat",
        "//tensorboard/components/polymer:irons_and_papers",
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/components/polymer:register_style_dom_module",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_card_heading",
        "//tensorboard/components/tf_categorization_utils",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_line_chart_data_loader",
        "//tensorboard/components/tf_paginated_view",
        "//tensorboard/components/tf_runs_selector",
        "//tensorboard/components/tf_storage",
        "//tensorboard/components/tf_utils",
        "//tensorboard/components/vz_chart_helpers",
        "//tensorboard/plugins/scalar/tf_scalar_dashboard:tf_smoothing_input",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/lodash",
        "@npm//lodash",
        "@npm//plottable",
    ],
)
