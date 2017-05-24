package(default_visibility = ["//tensorboard:internal"])

load("@io_bazel_rules_closure//closure:defs.bzl", "web_library")
load("//tensorboard:defs.bzl", "tensorboard_typescript_genrule")

licenses(["notice"])  # Apache 2.0

web_library(
    name = "tf_tensorboard",
    srcs = [
        "style.html",
        "tf-tensorboard.html",
        ":ts",
    ],
    path = "/tf-tensorboard",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_audio_dashboard",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_distribution_dashboard",
        "//tensorboard/components/tf_globals",
        "//tensorboard/components/tf_graph_dashboard",
        "//tensorboard/components/tf_histogram_dashboard",
        "//tensorboard/components/tf_image_dashboard",
        "//tensorboard/components/tf_scalar_dashboard",
        "//tensorboard/components/tf_storage",
        "//tensorboard/components/tf_text_dashboard",
        "//tensorboard/components/vz_projector",
        "@org_polymer",
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

web_library(
    name = "demo",
    srcs = ["demo.html"],
    path = "/tf-tensorboard",
    deps = [
        ":tf_tensorboard",
        "//tensorboard/demo:demo_data",
        "@org_polymer_webcomponentsjs",
    ],
)

tensorboard_typescript_genrule(
    name = "ts",
    srcs = ["autoReloadBehavior.ts"],
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    tags = ["notsan"],
)
