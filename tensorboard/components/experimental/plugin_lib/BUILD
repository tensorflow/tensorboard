package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:defs.bzl", "tf_ts_library", "tf_js_binary")

licenses(["notice"])  # Apache 2.0

# Serve for tests only.
tf_web_library(
    name = "test_lib",
    srcs = [
        "runs.ts",
        "message.ts",
        "plugin-guest.ts",
        "tf-plugin-lib.ts",
    ],
    path = "/tf-plugin-lib",
    visibility = ["//visibility:public"],
)

tf_ts_library(
    name = "ts_plugin_lib",
    srcs = [
        "message.ts",
        "plugin-guest.ts",
        "runs.ts",
        "tf-plugin-lib.ts",
    ],
)

# To update the plugin lib for clients relying on a source set of ES6 Modules:
# > bazel build tensorboard/components/experimental/plugin_lib:tb_plugin_lib
# Then copy this folder
# cp -r ./bazel-bin/tensorboard/components/experimental/plugin_lib/tb_plugin_lib.es6/tensorboard/components/experimental/plugin_lib/ tensorboard/components/experimental/plugin_lib/dist
# into dist/
tf_js_binary(
    name = "tb_plugin_lib",
    compile = 1,
    entry_point = "tf-plugin-lib.ts",
    deps = [
        ":ts_plugin_lib"
    ]
)
