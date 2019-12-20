package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tf_ts_library")

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_backend",
    srcs = [
        "backend.ts",
        "baseStore.ts",
        "canceller.ts",
        "environmentStore.ts",
        "experimentsStore.ts",
        "index.ts",
        "requestManager.ts",
        "router.ts",
        "runsStore.ts",
        "tf-backend-polymer.ts",
        "type.ts",
        "urlPathHelpers.ts",
    ],
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/vz_sorting",
        "@npm//lodash",
        "@npm//@types/lodash",
        "@npm//plottable",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
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
    ],
)
