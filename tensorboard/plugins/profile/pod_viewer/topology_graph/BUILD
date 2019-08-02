package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "topology_graph",
    srcs = [
        "topology-graph.html",
        "topology-graph.ts",
    ],
    path = "/pod-viewer",
    deps = [
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/profile/pod_viewer/pod_viewer_common",
        "@org_polymer_iron_icons",
        "@org_polymer_paper_icon_button",
        "@org_polymer_paper_item",
        "@org_polymer_paper_listbox",
        "@org_polymer_paper_menu_button",
    ],
)
