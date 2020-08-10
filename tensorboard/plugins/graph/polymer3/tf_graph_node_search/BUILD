load("//tensorboard/defs:web.bzl", "tf_web_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_graph_node_search",
    srcs = ["tf-graph-node-search.html"],
    path = "/tf-graph-node-search",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/graph/tf_graph_common",
        "@org_polymer_paper_input",
        "@org_polymer_paper_styles",
    ],
)
