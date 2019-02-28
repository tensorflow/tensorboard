package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_custom_scalar_dashboard",
    srcs = [
        "tf-custom-scalar-card-style.html",
        "tf-custom-scalar-dashboard.html",
        "tf-custom-scalar-helpers.html",
        "tf-custom-scalar-helpers.ts",
        "tf-custom-scalar-margin-chart-card.html",
        "tf-custom-scalar-multi-line-chart-card.html",
    ],
    path = "/tf-custom-scalar-dashboard",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_card_heading",
        "//tensorboard/components/tf_categorization_utils",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_line_chart_data_loader",
        "//tensorboard/components/tf_paginated_view",
        "//tensorboard/components/tf_runs_selector",
        "//tensorboard/components/tf_storage",
        "//tensorboard/components/tf_tensorboard:registry",
        "//tensorboard/components/tf_utils",
        "//tensorboard/components/vz_chart_helpers",
        "//tensorboard/plugins/scalar/tf_scalar_dashboard",
        "@org_polymer_iron_collapse",
        "@org_polymer_iron_icon",
        "@org_polymer_paper_button",
        "@org_polymer_paper_checkbox",
        "@org_polymer_paper_dropdown_menu",
        "@org_polymer_paper_icon_button",
        "@org_polymer_paper_input",
        "@org_polymer_paper_item",
        "@org_polymer_paper_menu",
        "@org_polymer_paper_slider",
        "@org_polymer_paper_styles",
    ],
)
