load("//tensorboard/defs:web.bzl", "tf_web_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_graph_debugger_data_card",
    srcs = [
        "tf-graph-debugger-data-card.html",
    ],
    path = "/tf-graph-debugger-data-card",
    deps = [
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/graph/tf_graph_common",
        "@org_polymer_paper_material",
        "@org_polymer_paper_slider",
        "@org_polymer_paper_spinner",
        "@org_polymer_paper_toggle_button",
    ],
)
