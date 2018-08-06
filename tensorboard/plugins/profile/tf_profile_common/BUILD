package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_profile_common",
    srcs = [
        "tf-profile-common.html",
        "util.ts",
    ],
    path = "/tf-profile-common",
    deps = [
        "//tensorboard/components/tf_imports:polymer",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_profile_common"],
    destdir = "tf-profile-common",
    deps = [
        "//tensorboard/components/tf_imports_google:lib",
        "//third_party/javascript/polymer/v1/polymer:lib",
    ],
)
