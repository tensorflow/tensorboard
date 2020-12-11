load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_scalar_dashboard",
    srcs = ["tf-scalar-dashboard.ts"],
    strict_checks = False,
    deps = [
        ":tf_scalar_card",
        ":tf_smoothing_input",
        "//tensorboard/components/polymer:irons_and_papers",
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_categorization_utils",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_globals",
        "//tensorboard/components/tf_paginated_view",
        "//tensorboard/components/tf_runs_selector",
        "//tensorboard/components/tf_storage",
        "//tensorboard/components/tf_utils",
        "//tensorboard/components/vz_chart_helpers",
        "//tensorboard/webapp/feature_flag:types",
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
        "//tensorboard/components/polymer:irons_and_papers",
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
        "//tensorboard/components/polymer:irons_and_papers",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_card_heading",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_line_chart_data_loader",
        "//tensorboard/components/vz_chart_helpers",
        "//tensorboard/components/vz_line_chart2",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)
