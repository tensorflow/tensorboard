package(default_visibility = ["//third_party/tensorflow:internal"])

load("//tensorboard:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "demo",
    srcs = ["index.html"],
    path = "/tf-scalar-dashboard/demo",
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:webcomponentsjs",
        "//tensorboard/components/tf_scalar_dashboard",
        "//tensorboard/demo:demo_data",
        "@org_polymer_iron_demo_helpers",
        "@org_polymer_paper_styles",
    ],
)

filegroup(
    name = "all_files",
    srcs = glob(["**"]),
    tags = ["notsan"],
)
