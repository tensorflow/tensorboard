package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

# TODO(stephanwlee): figure out how this tf_web_library can be used to create
# maybe a NPM package.
tf_web_library(
    name = "plugin_lib",
    srcs = [
        "runs.ts",
        "tf-plugin-lib.html",
    ],
    path = "/",
    deps = [
        "//tensorboard/components/plugin_util:plugin_guest",
    ],
)

tf_web_library(
    name = "host_impls",
    srcs = [
        "runs-host-impl.ts",
        "tf-plugin-host-impls.html",
    ],
    path = "/tf-plugin-lib",
    deps = [
        "//tensorboard/components/plugin_util:plugin_host",
        "//tensorboard/components/tf_backend",
    ],
)
