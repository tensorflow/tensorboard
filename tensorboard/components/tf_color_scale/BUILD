package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_color_scale",
    srcs = [
        "colorScale.ts",
        "palettes.ts",
        "tf-color-scale.html",
    ],
    path = "/tf-color-scale",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:polymer",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_color_scale"],
    visibility = ["//visibility:public"],
    destdir = "tf-color-scale",
    deps = [
        "//tensorboard/components/tf_backend:legacy",
        "//tensorboard/components/tf_imports_google:lib",
        "//third_party/javascript/polymer/v1/polymer:lib",
    ],
)
