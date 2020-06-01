load("//tensorboard/defs:web.bzl", "tf_web_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_paginated_view",
    srcs = [
        "paginatedViewStore.ts",
        "tf-category-paginated-view.html",
        "tf-dom-repeat.html",
        "tf-paginated-view-store.html",
    ],
    path = "/tf-paginated-view",
    deps = [
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_storage",
        "@org_polymer_iron_collapse",
        "@org_polymer_iron_icon",
        "@org_polymer_paper_button",
        "@org_polymer_paper_input",
        "@org_polymer_paper_styles",
    ],
)
