load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_distribution_dashboard",
    srcs = [
        "tf-distribution-dashboard.ts",
        "tf-distribution-loader.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components/polymer:irons_and_papers",
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_card_heading",
        "//tensorboard/components/tf_categorization_utils",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_paginated_view",
        "//tensorboard/components/tf_runs_selector",
        "//tensorboard/plugins/distribution/vz_distribution_chart",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
        "@npm//@types/lodash",
        "@npm//lodash",
    ],
)
