package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

# bazel run //third_party/tensorflow/tensorboard/plugins/graphs/tf_graph_controls/demo
ts_web_library(
    name = "demo",
    srcs = ["index.html"],
    path = "/tf-graph-controls/demo",
    deps = [
        "//tensorboard/plugins/graphs/tf_graph_controls",
        "//tensorboard/components/tf_imports:webcomponentsjs",
        "@org_polymer_iron_demo_helpers",
        "@org_polymer_paper_styles",
    ],
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    tags = ["notsan"],
)
