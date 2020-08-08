package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

# `tf_web_library`/`tf_ts_library` here removed to facilitate internal
# sync-testing scripts.

dict(
    name = "tf_graph_controls",
    srcs = [
        "tf-graph-controls.html",
        "tf-graph-controls.ts",
    ],
    path = "/tf-graph-controls",
    deps = [
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/graph/tf_graph_common",
        "//tensorboard/plugins/graph/tf_graph_node_search",
        "@org_polymer_iron_icon",
        "@org_polymer_paper_button",
        "@org_polymer_paper_dropdown_menu",
        "@org_polymer_paper_icon_button",
        "@org_polymer_paper_item",
        "@org_polymer_paper_listbox",
        "@org_polymer_paper_radio_group",
        "@org_polymer_paper_toggle_button",
        "@org_polymer_paper_tooltip",
    ],
)
