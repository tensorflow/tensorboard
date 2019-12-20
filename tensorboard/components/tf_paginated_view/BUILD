load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_paginated_view",
    srcs = [
        "paginatedViewStore.ts",
        "tf-category-paginated-view.ts",
        "tf-dom-repeat.ts",
    ],
    deps = [
        "//tensorboard/components/tf_categorization_utils",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_storage",
        "@npm//@polymer/decorators",
        "@npm//@polymer/iron-collapse",
        "@npm//@polymer/iron-icon",
        "@npm//@polymer/paper-button",
        "@npm//@polymer/paper-input",
        "@npm//@polymer/paper-styles",
        "@npm//@polymer/polymer",
    ],
)
