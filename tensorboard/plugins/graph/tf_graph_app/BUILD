load("//tensorboard/defs:defs.bzl", "tf_js_binary", "tf_ts_library")
load("//tensorboard/defs:web.bzl", "tb_combine_html", "tf_web_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_graph_app",
    srcs = [
        "tf-graph-app.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components/polymer:legacy_element_mixin",
        "//tensorboard/plugins/graph/tf_graph_board",
        "//tensorboard/plugins/graph/tf_graph_common",
        "//tensorboard/plugins/graph/tf_graph_controls",
        "//tensorboard/plugins/graph/tf_graph_loader",
        "@npm//@polymer/decorators",
        "@npm//@polymer/polymer",
    ],
)

tf_js_binary(
    name = "tf_graph_app_js_binary",
    compile = True,
    entry_point = ":tf-graph-app.ts",
    includes_polymer = True,
    deps = [":tf_graph_app"],
)

tf_web_library(
    name = "tf_graph_app_bundle",
    srcs = [
        "tf-graph-app.html",
        "tf_graph_app_js_binary.js",
    ],
    path = "/",
    deps = [
        "@com_google_fonts_roboto",
    ],
)

tb_combine_html(
    name = "binary",
    input_path = "/tf-graph-app.html",
    output_path = "/index.html",
    deps = [
        ":tf_graph_app_bundle",
    ],
)
