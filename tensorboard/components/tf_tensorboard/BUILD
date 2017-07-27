package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "ts_web_library")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "tf_tensorboard",
    srcs = [
        "autoReloadBehavior.ts",
        "style.html",
        "tf-tensorboard.html",
    ],
    path = "/tf-tensorboard",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_globals",
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_storage",
        "@org_polymer_font_roboto",
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

ts_web_library(
    name = "default_plugins",
    srcs = ["default-plugins.html"],
    path = "/tf-tensorboard",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/plugins/audio/tf_audio_dashboard",
        "//tensorboard/plugins/distribution/tf_distribution_dashboard",
        "//tensorboard/plugins/graph/tf_graph_dashboard",
        "//tensorboard/plugins/histogram/tf_histogram_dashboard",
        "//tensorboard/plugins/image/tf_image_dashboard",
        "//tensorboard/plugins/profile/tf_profile_dashboard",
        "//tensorboard/plugins/projector/vz_projector",
        "//tensorboard/plugins/scalar/tf_scalar_dashboard",
        "//tensorboard/plugins/text/tf_text_dashboard",
    ],
)

ts_web_library(
    name = "demo",
    srcs = ["demo.html"],
    path = "/tf-tensorboard",
    deps = [
        ":default_plugins",
        ":tf_tensorboard",
        "//tensorboard/demo:demo_data",
    ],
)

tensorboard_html_binary(
    name = "devserver",
    testonly = 1,
    input_path = "/tf-tensorboard/demo.html",
    output_path = "/index.html",
    deps = [":demo"],
)
