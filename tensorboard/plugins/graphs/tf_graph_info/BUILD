package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "tf_graph_info",
    srcs = [
        "tf-graph-icon.html",
        "tf-graph-info.html",
        "tf-node-info.html",
        "tf-node-list-item.html",
    ],
    path = "/tf-graph-info",
    deps = [
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/graphs/tf_graph_common",
        "//tensorboard/plugins/graphs/tf_graph_debugger_data_card",
        "@org_polymer_iron_collapse",
        "@org_polymer_iron_list",
        "@org_polymer_paper_button",
        "@org_polymer_paper_icon_button",
        "@org_polymer_paper_item",
        "@org_polymer_paper_material",
        "@org_polymer_paper_slider",
        "@org_polymer_paper_spinner",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_graph_info"],
    destdir = "tf-graph-info",
    deps = [
        "//tensorboard/components/tf_dashboard_common:legacy",
        "//tensorboard/plugins/graphs/tf_graph_common:legacy",
        "//tensorboard/plugins/graphs/tf_graph_debugger_data_card:legacy",
        "//third_party/javascript/polymer/v1/iron-collapse:lib",
        "//third_party/javascript/polymer/v1/iron-list:lib",
        "//third_party/javascript/polymer/v1/paper-icon-button:lib",
        "//third_party/javascript/polymer/v1/paper-item:lib",
        "//third_party/javascript/polymer/v1/paper-slider:lib",
        "//third_party/javascript/polymer/v1/paper-spinner:lib",
        "//third_party/javascript/polymer/v1/polymer:lib",
    ],
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    tags = ["notsan"],
)
