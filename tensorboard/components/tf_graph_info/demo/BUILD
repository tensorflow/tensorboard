package(default_visibility = ["//third_party/tensorflow:internal"])

load("//tensorboard:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

# bazel run //third_party/tensorflow/tensorboard/components/tf_graph_info/demo
ts_web_library(
    name = "demo",
    srcs = ["index.html"] + glob(["data/**"]),
    path = "/tf-graph-info/demo",
    deps = [
        "//tensorboard/components/tf_graph_common",
        "//tensorboard/components/tf_graph_info",
        "//tensorboard/components/tf_graph_loader",
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
