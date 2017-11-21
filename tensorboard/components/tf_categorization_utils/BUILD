package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "tf_categorization_utils",
    srcs = [
        "categorizationUtils.js",
        "tf-categorization-utils.html",
        "tf-category-pane.html",
    ],
    path = "/tf-categorization-utils",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/vz_sorting",
        "@org_polymer_iron_collapse",
    ],
)
