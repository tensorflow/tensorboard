package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_tensorboard",
    srcs = [
        "autoReloadBehavior.ts",
        "style.html",
        "tf-tensorboard.html",
    ],
    path = "/tf-tensorboard",
    visibility = ["//visibility:public"],
    deps = [
        ":registry",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_data_selector",
        "//tensorboard/components/tf_globals",
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_paginated_view",
        "//tensorboard/components/tf_storage",
        "@com_google_fonts_roboto",
        "@org_polymer_iron_icons",
        "@org_polymer_paper_button",
        "@org_polymer_paper_checkbox",
        "@org_polymer_paper_dialog",
        "@org_polymer_paper_header_panel",
        "@org_polymer_paper_icon_button",
        "@org_polymer_paper_tabs",
        "@org_polymer_paper_toolbar",
    ],
)

tf_web_library(
    name = "registry",
    srcs = [
        "registry.html",
        "registry.ts",
    ],
    path = "/tf-tensorboard",
    visibility = ["//visibility:public"],
)

tf_web_library(
    name = "default_plugins",
    srcs = ["default-plugins.html"],
    path = "/tf-tensorboard",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/plugins/audio/tf_audio_dashboard",
        "//tensorboard/plugins/beholder/tf_beholder_dashboard",
        "//tensorboard/plugins/custom_scalar/tf_custom_scalar_dashboard",
        "//tensorboard/plugins/debugger/tf_debugger_dashboard",
        "//tensorboard/plugins/distribution/tf_distribution_dashboard",
        "//tensorboard/plugins/graph/tf_graph_dashboard",
        "//tensorboard/plugins/histogram/tf_histogram_dashboard",
        "//tensorboard/plugins/image/tf_image_dashboard",
        "//tensorboard/plugins/interactive_inference/tf_interactive_inference_dashboard",
        "//tensorboard/plugins/pr_curve/tf_pr_curve_dashboard",
        "//tensorboard/plugins/profile/tf_profile_dashboard",
        "//tensorboard/plugins/projector/vz_projector",
        "//tensorboard/plugins/scalar/tf_scalar_dashboard",
        "//tensorboard/plugins/text/tf_text_dashboard",
    ],
)

tf_web_library(
    name = "demo",
    srcs = ["demo.html"],
    path = "/tf-tensorboard",
    deps = [
        ":default_plugins",
        ":tf_tensorboard",
        "//tensorboard/demo:demo_data",
    ],
)
