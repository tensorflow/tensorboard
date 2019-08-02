package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "stack_bar_chart",
    srcs = [
        "stack-bar-chart.html",
        "stack-bar-chart.ts",
    ],
    path = "/pod-viewer",
    deps = [
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/profile/pod_viewer/pod_viewer_common",
    ],
)
