package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "tf_profile_dashboard",
    srcs = [
        "tf-profile-dashboard.html",
    ],
    path = "/tf-profile-dashboard",
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/plugins/graphs/tf_graph_controls",
        "@org_polymer",
        "@org_polymer_paper_dropdown_menu",
        "@org_polymer_paper_item",
        "@org_polymer_paper_menu",
    ],
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    tags = ["notsan"],
)
