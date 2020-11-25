load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_paginated_view",
    srcs = [
        "index.ts",
        "paginatedViewStore.ts",
        "tf-category-paginated-view.ts",
        "tf-dom-repeat.ts",
        "tf-paginated-view-store.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components/polymer:irons_and_papers",
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/components/polymer:register_style_dom_module",
        "//tensorboard/components/tf_categorization_utils",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_storage",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)
