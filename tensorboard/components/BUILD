load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:defs.bzl", "tf_js_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "app",
    srcs = [
        "index.html",
        ":index.js",
    ],
    path = "/",
)

tf_ts_library(
    name = "lib",
    srcs = [
        "analytics.ts",
        "polymer_config.ts",
        "tensorboard.ts",
    ],
    deps = [
        "//tensorboard/components/tf_tensorboard",
        "//tensorboard/components/tf_tensorboard:default_plugins",
    ],
)

tf_js_binary(
    name = "index",
    compile = 1,
    entry_point = ":tensorboard.ts",
    deps = [
        ":lib",
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
        "@npm//@polymer/paper-dialog-scrollable",
        "@npm//@polymer/paper-dropdown-menu",
        "@npm//@polymer/paper-header-panel",
        "@npm//@polymer/paper-icon-button",
        "@npm//@polymer/paper-input",
        "@npm//@polymer/paper-item",
        "@npm//@polymer/paper-listbox",
        "@npm//@polymer/paper-menu-button",
        "@npm//@polymer/paper-slider",
        "@npm//@polymer/paper-spinner",
        "@npm//@polymer/paper-styles",
        "@npm//@polymer/paper-tabs",
        "@npm//@polymer/paper-toggle-button",
        "@npm//@polymer/paper-toolbar",
        "@npm//@polymer/polymer",
        "@npm//d3",
        "@npm//lodash",
        "@npm//plottable",
        "@npm//rollup-plugin-commonjs",
        "@npm//rollup-plugin-node-resolve",
    ],
)

tf_web_library(
    name = "security",
    srcs = [
        "security.html",
    ],
    path = "/",
    visibility = ["//visibility:public"],
)

# tf_web_library(
#     name = "ng_polymer_lib",
#     srcs = [
#         "ng_polymer_lib.html",
#     ],
#     path = "/",
#     deps = [
#         ":analytics",
#         ":security",
#         "//tensorboard/components/tf_backend",
#         "//tensorboard/components/tf_imports:polymer",
#         "//tensorboard/components/tf_storage",
#         "//tensorboard/components/tf_tensorboard",
#         "//tensorboard/components/tf_tensorboard:default_plugins",
#         "//tensorboard/components/tf_tensorboard:registry",
#     ],
# )

# TODO(stephanwlee): Fix me when trace_viewer can be factored out.

# tf_web_library(
#     name = "trace_viewer",
#     srcs = ["trace_viewer.html"],
#     path = "/",
#     deps = [
#         "//tensorboard/components/tf_imports:polymer",
#         "//tensorboard/components/tf_trace_viewer",
#     ],
# )

# tensorboard_html_binary(
#     name = "trace_viewer_index",
#     input_path = "/trace_viewer.html",
#     js_path = "/trace_viewer_index.js",
#     output_path = "/trace_viewer_index.html",
#     deps = [":trace_viewer"],
# )
