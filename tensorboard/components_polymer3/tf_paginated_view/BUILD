load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

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
        "//tensorboard/components_polymer3/polymer:legacy_element_mixin",
        "//tensorboard/components_polymer3/polymer:register_style_dom_module",
        "//tensorboard/components_polymer3/tf_categorization_utils",
        "//tensorboard/components_polymer3/tf_dashboard_common",
        "//tensorboard/components_polymer3/tf_storage",
        "@npm//@polymer/decorators",
        "@npm//@polymer/iron-collapse",
        "@npm//@polymer/iron-icon",
        "@npm//@polymer/paper-button",
        "@npm//@polymer/paper-input",
        "@npm//@polymer/paper-styles",
        "@npm//@polymer/polymer",
    ],
)
