package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "umap",
    srcs = [
        "heap.ts",
        "matrix.ts",
        "nn-descent.ts",
        "tree.ts",
        "umap.ts", 
        "utils.ts",
    ],
    path = "/vz-projector/umap",
    visibility = ["//visibility:public"],
)
