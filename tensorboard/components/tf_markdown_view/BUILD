package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_markdown_view",
    srcs = ["tf-markdown-view.html"],
    path = "/tf-markdown-view",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "@org_polymer_paper_styles",
    ],
)
