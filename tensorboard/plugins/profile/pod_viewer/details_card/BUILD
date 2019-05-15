package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "details_card",
    srcs = [
        "details-card.html",
        "details-card.ts",
    ],
    path = "/pod-viewer",
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/profile/pod_viewer/pod_viewer_common",
        "@org_polymer_paper_card",
    ],
)
