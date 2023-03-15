load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "dom",
    srcs = [
        "dom.ts",
    ],
    deps = [
        "@npm//@polymer/polymer",
    ],
)

tf_ts_library(
    name = "dom-repeat",
    srcs = [
        "dom-repeat.ts",
    ],
    deps = [
        "@npm//@polymer/polymer",
    ],
)

tf_ts_library(
    name = "dark_mode_mixin",
    srcs = [
        "dark_mode_mixin.ts",
    ],
    deps = [
        "@npm//@polymer/polymer",
    ],
)

tf_ts_library(
    name = "legacy_element_mixin",
    srcs = [
        "legacy_element_mixin.ts",
    ],
    deps = [
        "@npm//@polymer/polymer",
    ],
)

tf_ts_library(
    name = "paper_inky_focus_behavior",
    srcs = [
        "paper_inky_focus_behavior.ts",
    ],
    deps = [
        "@npm//@polymer/paper-behaviors",
    ],
)

tf_ts_library(
    name = "plottable_style",
    srcs = ["plottable-style.ts"],
    deps = [":register_style_dom_module"],
)

genrule(
    name = "gen_plottable_style",
    srcs = [
        "plottable-style.uninlined.ts",
        "@npm//:node_modules/plottable/plottable.css",
    ],
    outs = ["plottable-style.ts"],
    cmd = "$(execpath //tensorboard/tools:inline_file_content) $(SRCS) >'$@'",
    tools = ["//tensorboard/tools:inline_file_content"],
)

tf_ts_library(
    name = "register_style_dom_module",
    srcs = [
        "register_style_dom_module.ts",
    ],
    deps = [
        "@npm//@polymer/polymer",
    ],
)

tf_ts_library(
    name = "utils_mixin",
    srcs = [
        "utils_mixin.ts",
    ],
    deps = [
        "@npm//@polymer/polymer",
    ],
)

tf_ts_library(
    name = "irons_and_papers",
    srcs = [
        "irons_and_papers.ts",
    ],
    deps = [
        "@npm//@polymer/iron-collapse",
        "@npm//@polymer/iron-flex-layout",
        "@npm//@polymer/iron-icon",
        "@npm//@polymer/iron-icons",
        "@npm//@polymer/iron-iconset-svg",
        "@npm//@polymer/iron-list",
        "@npm//@polymer/iron-pages",
        "@npm//@polymer/paper-button",
        "@npm//@polymer/paper-checkbox",
        "@npm//@polymer/paper-dialog",
        "@npm//@polymer/paper-dialog-scrollable",
        "@npm//@polymer/paper-dropdown-menu",
        "@npm//@polymer/paper-header-panel",
        "@npm//@polymer/paper-icon-button",
        "@npm//@polymer/paper-input",
        "@npm//@polymer/paper-item",
        "@npm//@polymer/paper-listbox",
        "@npm//@polymer/paper-material",
        "@npm//@polymer/paper-menu-button",
        "@npm//@polymer/paper-progress",
        "@npm//@polymer/paper-radio-button",
        "@npm//@polymer/paper-radio-group",
        "@npm//@polymer/paper-slider",
        "@npm//@polymer/paper-spinner",
        "@npm//@polymer/paper-styles",
        "@npm//@polymer/paper-tabs",
        "@npm//@polymer/paper-toast",
        "@npm//@polymer/paper-toggle-button",
        "@npm//@polymer/paper-toolbar",
        "@npm//@polymer/paper-tooltip",
    ],
)

tf_ts_library(
    name = "legacy_class",
    srcs = [
        "legacy_class.ts",
    ],
    deps = [
        "@npm//@polymer/polymer",
    ],
)
