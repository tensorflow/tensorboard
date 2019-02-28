package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_storage",
    srcs = [
        "listeners.ts",
        "storage.ts",
        "tf-storage.html",
    ],
    path = "/tf-storage",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_globals",
        "//tensorboard/components/tf_imports:lodash",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_storage"],
    destdir = "tf-storage",
    deps = [
        "//tensorboard/components/tf_globals:legacy",
        "//tensorboard/components/tf_imports_google:lib",
        "//third_party/javascript/polymer/v1/polymer:lib",
    ],
)
