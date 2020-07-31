load("//tensorboard/defs:defs.bzl", "tf_js_binary", "tf_ts_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_ts_library(
    name = "tf_graph_app",
    srcs = [
        "tf-graph-app.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components_polymer3/polymer:legacy_element_mixin",
        "//tensorboard/plugins/graph/polymer3/tf_graph_board",
        "//tensorboard/plugins/graph/polymer3/tf_graph_controls",
        "//tensorboard/plugins/graph/polymer3/tf_graph_loader",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)

tf_js_binary(
    name = "tf_graph_app_js_binary",
    compile = 1,
    entry_point = ":tf-graph-app.ts",
    deps = [":tf_graph_app"],
)

tf_web_library(
    name = "tf_graph_app_bundle",
    srcs = [
        "tf-graph-app.html",
        "tf_graph_app_js_binary.js",
    ],
    path = "/tf-graph-app",
)

tensorboard_html_binary(
    name = "binary",
    compile = True,
    input_path = "/tf-graph-app/tf-graph-app.html",
    output_path = "/tf-graph-app/binary.html",
    deps = [":tf_graph_app_bundle"],
)
