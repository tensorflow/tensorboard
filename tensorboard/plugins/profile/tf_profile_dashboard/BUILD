package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "tf_profile_dashboard",
    srcs = ["tf-profile-dashboard.html"],
    path = "/tf-profile-dashboard",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/vz_sorting",
        "//tensorboard/plugins/graph/tf_graph_controls",
        "//tensorboard/plugins/profile/tf_op_profile",
        "@org_polymer",
        "@org_polymer_paper_dropdown_menu",
        "@org_polymer_paper_item",
        "@org_polymer_paper_menu",
    ],
)
