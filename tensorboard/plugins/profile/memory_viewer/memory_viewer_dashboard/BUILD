package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "memory_viewer_dashboard",
    srcs = [
            "memory-viewer-dashboard.html",
            "memory-viewer-dashboard.ts",
           ],
    path = "/memory-viewer",
    deps = [
        "//tensorboard/plugins/profile/memory_viewer/memory_usage",
        "//tensorboard/plugins/profile/memory_viewer/utils",
        "//tensorboard/plugins/profile/memory_viewer/xla",
        "//tensorboard/plugins/profile/memory_viewer/mv_line_chart",
        "//tensorboard/plugins/profile/memory_viewer/buffer_details",
        "//tensorboard/components/tf_imports:polymer",
    ],
)

