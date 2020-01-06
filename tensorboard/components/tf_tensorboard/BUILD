load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_tensorboard",
    srcs = [
        "autoReloadBehavior.ts",
        "ga.d.ts",
        "tf-tensorboard.ts",
    ],
    visibility = ["//visibility:public"],
    deps = [
        ":registry",
        "//tensorboard/components/experimental/plugin_util:plugin_host",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_globals",
        "//tensorboard/components/tf_paginated_view",
        "//tensorboard/components/tf_storage",
        "@npm//@polymer/decorators",
        "@npm//@polymer/iron-icons",
        "@npm//@polymer/paper-button",
        "@npm//@polymer/paper-checkbox",
        "@npm//@polymer/paper-dialog",
        "@npm//@polymer/paper-dropdown-menu",
        "@npm//@polymer/paper-header-panel",
        "@npm//@polymer/paper-icon-button",
        "@npm//@polymer/paper-input",
        "@npm//@polymer/paper-listbox",
        "@npm//@polymer/paper-tabs",
        "@npm//@polymer/paper-toolbar",
        "@npm//@polymer/polymer",
    ],
)

tf_ts_library(
    name = "registry",
    srcs = [
        "registry.ts",
    ],
)

tf_ts_library(
    name = "plugin_dialog",
    srcs = [
        "plugin-dialog.ts",
    ],
    visibility = ["//visibility:public"],
    deps = [
        "@npm//@polymer/polymer",
    ],
)

tf_ts_library(
    name = "default_plugins",
    srcs = ["default-plugins.ts"],
    deps = [
        "//tensorboard/plugins/scalar/tf_scalar_dashboard",
    ],
)
