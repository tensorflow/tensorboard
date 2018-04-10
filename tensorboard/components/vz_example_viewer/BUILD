package(default_visibility = ["//visibility:public"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "vz_example_viewer",
    srcs = [
        "utils.ts",
        "vz-example-viewer.html",
        "vz-example-viewer.ts",
    ],
    path = "/vz-example-viewer",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:polymer",
    ],
)
