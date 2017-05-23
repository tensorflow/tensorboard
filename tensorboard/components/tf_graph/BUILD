package(default_visibility = ["//third_party/tensorflow:internal"])

load("@io_bazel_rules_closure//closure:defs.bzl", "web_library")

licenses(["notice"])  # Apache 2.0

web_library(
    name = "tf_graph",
    srcs = [
        "tf-graph.html",
        "tf-graph-minimap.html",
        "tf-graph-scene.html",
    ],
    path = "/tf-graph",
    deps = [
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_graph_common",
        "@org_polymer",
        "@org_polymer_iron_flex_layout",
        "@org_polymer_iron_icons",
        "@org_polymer_paper_button",
        "@org_polymer_paper_dropdown_menu",
        "@org_polymer_paper_input",
        "@org_polymer_paper_menu",
        "@org_polymer_paper_radio_group",
        "@org_polymer_paper_toggle_button",
        "@org_polymer_paper_tooltip",
    ],
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    tags = ["notsan"],
)

################################################################################
# MARKED FOR DELETION

load("//tensorboard:tensorboard.google.bzl", "tensorboard_webcomponent_library")

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [
        "tf-graph.html",
        "tf-graph-minimap.html",
        "tf-graph-scene.html",
    ],
    destdir = "tf-graph",
    deps = [
        "//tensorboard/components/tf_graph_common:legacy",
    ],
)
