package(default_visibility = ["//visibility:public"])

load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_hparams_backend",
    srcs = [
        "tf-hparams-backend.html",
    ],
    path = "/tf-hparams-backend",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_backend",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_hparams_backend"],
    visibility = ["//visibility:public"],
    destdir = "tf-hparams-backend",
    deps = [
        "//third_party/tensorboard/components/tf_backend:legacy",
    ],
)
