package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "tf_audio_dashboard",
    srcs = [
        "tf-audio-dashboard.html",
        "tf-audio-grid.html",
        "tf-audio-loader.html",
    ],
    path = "/tf-audio-dashboard",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_card_heading",
        "//tensorboard/components/tf_categorization_utils",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_markdown_view",
        "//tensorboard/components/tf_paginated_view",
        "//tensorboard/components/tf_runs_selector",
        "@org_polymer_iron_icon",
        "@org_polymer_paper_icon_button",
        "@org_polymer_paper_input",
        "@org_polymer_paper_slider",
        "@org_polymer_paper_spinner",
        "@org_polymer_paper_styles",
    ],
)

ts_web_library(
    name = "index",
    srcs = [
        "demo/index.html",
        "index.html",
    ],
    path = "/tf-audio-dashboard",
    deps = [
        ":tf_audio_dashboard",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:webcomponentsjs",
        "//tensorboard/demo:demo_data",
        "@org_polymer_iron_component_page",
        "@org_polymer_iron_demo_helpers",
        "@org_polymer_paper_styles",
    ],
)
