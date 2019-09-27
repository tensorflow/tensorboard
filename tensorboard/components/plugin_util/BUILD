package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "message",
    srcs = [
        "message.html",
        "message.ts",
    ],
    path = "/tf-plugin-lib",
)

tf_web_library(
    name = "plugin_guest",
    srcs = [
        "plugin-guest.html",
        "plugin-guest.ts",
    ],
    path = "/tf-plugin-lib",
    visibility = [
        "//tensorboard/components/plugin_lib:__subpackages__",
        "//tensorboard/components/plugin_util/test:__subpackages__",
    ],
    deps = [":message"],
)

tf_web_library(
    name = "plugin_host",
    srcs = [
        "plugin-host.html",
        "plugin-host.ts",
    ],
    path = "/tf-plugin-lib",
    deps = [":message"],
)
