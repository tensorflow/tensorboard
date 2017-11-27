package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_distribution_dashboard",
    srcs = [
        "tf-distribution-dashboard.html",
        "tf-distribution-loader.html",
    ],
    path = "/tf-distribution-dashboard",
    visibility = ["//visibility:public"],
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
        "//tensorboard/plugins/distribution/vz_distribution_chart",
        "@org_polymer_iron_collapse",
        "@org_polymer_iron_icon",
        "@org_polymer_paper_button",
        "@org_polymer_paper_icon_button",
        "@org_polymer_paper_input",
        "@org_polymer_paper_styles",
    ],
)

tf_web_library(
    name = "demo",
    srcs = ["index.html"] + glob(["data/**"]),
    path = "/tf-distribution-dashboard",
    deps = [
        ":tf_distribution_dashboard",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:webcomponentsjs",
        "@org_polymer_iron_demo_helpers",
        "@org_polymer_paper_styles",
    ],
)
