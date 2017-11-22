package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

# bazel run //tensorboard/plugins/graph/tf_graph_dashboard/demo
tf_web_library(
    name = "demo",
    srcs = ["index.html"] + glob(["data/**"]),
    path = "/tf-graph-dashboard/demo",
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_imports:webcomponentsjs",
        "//tensorboard/plugins/graph/tf_graph_dashboard",
        "@org_polymer_iron_demo_helpers",
        "@org_polymer_paper_styles",
    ],
)

