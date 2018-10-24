package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_data_selector",
    srcs = [
        "experiment-selector.html",
        "experiment-selector.ts",
        "storage-utils.html",
        "storage-utils.ts",
        "tf-collapsible-data-selector.html",
        "tf-collapsible-data-selector.ts",
        "tf-data-select-row.html",
        "tf-data-select-row.ts",
        "tf-data-selector-advanced.html",
        "tf-data-selector-advanced.ts",
        "tf-data-selector-simple.html",
        "tf-data-selector-simple.ts",
    ],
    path = "/tf-data-selector",
    visibility = ["//visibility:public"],
    deps = [
        ":type",
        "@org_polymer_iron_collapse",
        "@org_polymer_iron_icon",
        "@org_polymer_paper_button",
        "@org_polymer_paper_checkbox",
        "@org_polymer_paper_icon_button",
        "@org_polymer_paper_input",
        "@org_polymer_paper_styles",
        "@org_polymer_paper_tooltip",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_imports:polymer",
    ],
)

tf_web_library(
    name = "type",
    srcs = [
        "type.html",
        "type.ts",
    ],
    path = "/tf-data-selector",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_backend:type",
    ],
)
