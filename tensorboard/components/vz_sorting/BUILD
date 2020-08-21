load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "vz_sorting",
    srcs = [
        "sorting.ts",
        "vz-sorting.html",
    ],
    path = "/vz-sorting",
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":vz_sorting"],
    destdir = "vz-sorting",
)
