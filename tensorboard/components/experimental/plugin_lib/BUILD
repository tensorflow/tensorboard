package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "guest_internals",
    srcs = [
        "plugin-guest.ts",
    ],
    path = "/tf-plugin-lib",
    deps = [
        "//tensorboard/components/experimental/plugin_util:message",
    ],
)

# TODO(psybuzz): figure out how this tf_web_library can be used to create
# maybe a NPM package.
tf_web_library(
    name = "plugin_lib",
    srcs = [
        "runs.ts",
        "tf-plugin-lib.html",
    ],
    path = "/tf-plugin-lib",
    visibility = ["//visibility:public"],
    deps = [
        ":guest_internals",
        "//tensorboard/components/experimental/plugin_util:message",
    ],
)
