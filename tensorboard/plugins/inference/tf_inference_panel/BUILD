package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_inference_panel",
    srcs = [
        "tf-inference-panel.html",
    ],
    path = "/tf-inference-panel",
    deps = [
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_storage",
        "@org_polymer_paper_button",
        "@org_polymer_paper_input",
    ],
)
