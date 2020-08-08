load("//tensorboard/defs:web.bzl", "tf_web_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_graph_info",
    srcs = [
        "tf-graph-info.html",
        "tf-node-info.html",
        "tf-node-list-item.html",
    ],
    path = "/tf-graph-info",
    deps = [
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_wbr_string",
        "//tensorboard/plugins/graph/tf_graph_common",
        "//tensorboard/plugins/graph/tf_graph_debugger_data_card",
        "//tensorboard/plugins/graph/tf_graph_op_compat_card",
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
