package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

# bazel run //tensorboard/plugins/graph/standalone
tf_web_library(
    name = "standalone",
    srcs = ["index.html"],
    path = "/standalone",
    deps = [
        "//tensorboard/components/tf_imports:webcomponentsjs",
        "//tensorboard/plugins/graph/tf_graph_board",
        "//tensorboard/plugins/graph/tf_graph_controls",
        "//tensorboard/plugins/graph/tf_graph_loader",
        "@org_polymer_paper_styles",
    ],
)
