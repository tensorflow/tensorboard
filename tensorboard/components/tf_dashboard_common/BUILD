load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_dashboard_common",
    srcs = [
        "array-update-helper.ts",
        "dashboard-style.ts",
        "data-loader-behavior.ts",
        "run-color-style.ts",
        "scrollbar-style.ts",
        "tensorboard-color.ts",
        "tf-dashboard-layout.ts",
        "tf-downloader.ts",
        "tf-dropdown-trigger.ts",
        "tf-filterable-checkbox-dropdown.ts",
        "tf-filterable-checkbox-list.ts",
        "tf-multi-checkbox.ts",
        "tf-no-data-warning.ts",
        "tf-option-selector.ts",
    ],
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_backend",
        "@npm//@polymer/decorators",
        "@npm//@polymer/iron-ajax",
        "@npm//@polymer/iron-behaviors",
        "@npm//@polymer/iron-collapse",
        "@npm//@polymer/iron-flex-layout",
        "@npm//@polymer/iron-icon",
        "@npm//@polymer/iron-icons",
        "@npm//@polymer/paper-button",
        "@npm//@polymer/paper-checkbox",
        "@npm//@polymer/paper-dialog",
        "@npm//@polymer/paper-dropdown-menu",
        "@npm//@polymer/paper-icon-button",
        "@npm//@polymer/paper-input",
        "@npm//@polymer/paper-item",
        "@npm//@polymer/paper-listbox",
        "@npm//@polymer/paper-menu-button",
        "@npm//@polymer/paper-slider",
        "@npm//@polymer/paper-spinner",
        "@npm//@polymer/paper-styles",
        "@npm//@polymer/paper-toggle-button",
        "@npm//@polymer/polymer",
        "@npm//@types/lodash",
        "@npm//lodash",
    ],
)
