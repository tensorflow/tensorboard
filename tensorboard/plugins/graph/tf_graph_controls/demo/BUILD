package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

# bazel run //tensorboard/plugins/graph/tf_graph_controls/demo
tf_web_library(
    name = "demo",
    srcs = ["index.html"],
    path = "/tf-graph-controls/demo",
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/graph/tf_graph_controls",
        "@org_polymer_iron_demo_helpers",
        "@org_polymer_paper_styles",
    ],
)
