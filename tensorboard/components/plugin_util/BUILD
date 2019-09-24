package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "plugin_host",
    srcs = [
        "plugin-host.html",
        "plugin-host.js",
    ],
    path = "/tf-plugin",
    deps = [
        ":plugin_lib",
        "//tensorboard/components/tf_backend",
    ],
)

tf_web_library(
    name = "plugin_lib",
    srcs = [
        "message.js",
    ],
    path = "/tf-plugin",
)

tf_web_library(
    name = "plugin_guest",
    srcs = [
        "plugin-guest.html",
        "plugin-guest.js",
    ],
    path = "/tf-plugin",
    visibility = ["//visibility:public"],
    deps = [
        ":plugin_lib",
    ],
)
