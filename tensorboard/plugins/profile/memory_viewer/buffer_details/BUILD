package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "buffer_details",
    srcs = [
        "buffer-details.html",
        "buffer-details.ts",
    ],
    path = "/memory-viewer",
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/profile/memory_viewer/utils",
        "@org_polymer_paper_card",
    ],
)
