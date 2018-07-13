package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_profile_dashboard",
    srcs = ["tf-profile-dashboard.html"],
    path = "/tf-profile-dashboard",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_tensorboard:registry",
        "//tensorboard/components/vz_sorting",
        "//tensorboard/plugins/graph/tf_graph_controls",
        "//tensorboard/plugins/profile/google_chart:google_chart_demo",
        "//tensorboard/plugins/profile/input_pipeline_analyzer",
        "//tensorboard/plugins/profile/memory_viewer/memory_viewer_dashboard",
        "//tensorboard/plugins/profile/overview_page",
        "//tensorboard/plugins/profile/tf_op_profile",
        "//tensorboard/plugins/profile/tf_profile_common",
        "@org_polymer",
        "@org_polymer_paper_dropdown_menu",
        "@org_polymer_paper_item",
        "@org_polymer_paper_menu",
        "@org_polymer_paper_progress",
    ],
)
