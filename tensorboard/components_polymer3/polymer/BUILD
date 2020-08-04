load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

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
