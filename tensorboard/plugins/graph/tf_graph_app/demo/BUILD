package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

# bazel run //tensorboard/plugins/graph/tf_graph_app/demo
tf_web_library(
    name = "demo",
    srcs = ["index.html"] + glob(["data/**"]),
    path = "/tf-graph-app/demo",
    deps = [
        "//tensorboard/plugins/graph/tf_graph_app",
        "@org_polymer_iron_demo_helpers",
        "@org_polymer_paper_styles",
    ],
)

