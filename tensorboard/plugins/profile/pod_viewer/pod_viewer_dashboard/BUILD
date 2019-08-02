package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "pod_viewer_dashboard",
    srcs = [
        "pod-viewer-dashboard.html",
        "pod-viewer-dashboard.ts",
    ],
    path = "/pod-viewer",
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/profile/pod_viewer/pod_viewer_common",
        "//tensorboard/plugins/profile/pod_viewer/stack_bar_chart",
        "//tensorboard/plugins/profile/pod_viewer/topology_graph",
        "@org_polymer_paper_slider",
    ],
)
