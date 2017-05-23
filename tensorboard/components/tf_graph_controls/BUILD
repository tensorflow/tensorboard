package(default_visibility = ["//third_party/tensorflow:internal"])

load("@io_bazel_rules_closure//closure:defs.bzl", "web_library")

licenses(["notice"])  # Apache 2.0

web_library(
    name = "tf_graph_controls",
    srcs = [
        "tf-graph-controls.html",
    ],
    path = "/tf-graph-controls",
    deps = [
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_graph_common",
        "@org_polymer",
        "@org_polymer_paper_button",
        "@org_polymer_paper_dropdown_menu",
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
        "tf-graph-controls.html",
    ],
    destdir = "tf-graph-controls",
    deps = [
        "//tensorboard/components/tf_dashboard_common:legacy",
        "//tensorboard/components/tf_graph_common:legacy",
    ],
)
