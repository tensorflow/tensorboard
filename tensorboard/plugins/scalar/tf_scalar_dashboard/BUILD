package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_scalar_dashboard",
    srcs = [
        "tf-scalar-dashboard.html",
        "tf-smoothing-input.html",
    ],
    path = "/tf-scalar-dashboard",
    visibility = ["//visibility:public"],
    deps = [
        ":tf_scalar_card",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_categorization_utils",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_data_selector:type",
        "//tensorboard/components/tf_globals",
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_paginated_view",
        "//tensorboard/components/tf_runs_selector",
        "//tensorboard/components/tf_storage",
        "//tensorboard/components/tf_tensorboard:registry",
        "//tensorboard/components/tf_utils",
        "//tensorboard/components/vz_chart_helpers",
        "@org_polymer_iron_collapse",
        "@org_polymer_paper_button",
        "@org_polymer_paper_checkbox",
        "@org_polymer_paper_dropdown_menu",
        "@org_polymer_paper_input",
        "@org_polymer_paper_item",
        "@org_polymer_paper_menu",
        "@org_polymer_paper_slider",
        "@org_polymer_paper_styles",
    ],
)

tf_web_library(
    name = "tf_scalar_card",
    srcs = [
        "tf-scalar-card.html",
    ],
    path = "/tf-scalar-dashboard",
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_card_heading",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_line_chart_data_loader",
        "@org_polymer_paper_dropdown_menu",
        "@org_polymer_paper_icon_button",
        "@org_polymer_paper_item",
        "@org_polymer_paper_listbox",
        "@org_polymer_paper_menu",
        "@org_polymer_paper_menu_button",
    ],
)

tensorboard_webcomponent_library(
    name = "tf_scalar_card_legacy",
    srcs = [":tf_scalar_card"],
    visibility = ["//visibility:public"],
    destdir = "tf-scalar-dashboard",
    deps = [
        "//tensorboard/components/tf_backend:legacy",
        "//tensorboard/components/tf_card_heading:legacy",
        "//tensorboard/components/tf_line_chart_data_loader:legacy",
        "//third_party/javascript/polymer/v1/paper-dropdown-menu:lib",
        "//third_party/javascript/polymer/v1/paper-icon-button:lib",
        "//third_party/javascript/polymer/v1/paper-item:lib",
        "//third_party/javascript/polymer/v1/paper-listbox:lib",
        "//third_party/javascript/polymer/v1/paper-menu:lib",
        "//third_party/javascript/polymer/v1/paper-menu-button:lib",
        "//third_party/javascript/polymer/v1/polymer:lib",
    ],
)
