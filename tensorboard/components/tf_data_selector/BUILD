package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_data_selector",
    srcs = [
        "experiment-selector.html",
        "experiment-selector.ts",
        "storage-utils.ts",
        "tf-data-select-row.html",
        "tf-data-select-row.ts",
        "tf-data-selector.html",
        "tf-data-selector.ts",
    ],
    path = "/tf-data-selector",
    visibility = ["//visibility:public"],
    deps = [
        "@org_polymer_paper_button",
        "@org_polymer_paper_styles",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:polymer",
    ],
)
