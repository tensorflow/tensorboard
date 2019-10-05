package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:defs.bzl", "tf_ts_library", "tf_js_binary")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "test_lib",
    srcs = [
        "runs.ts",
        "message.ts",
        "plugin-guest.ts",
        "tf-plugin-lib.ts",
    ],
    testonly = 1,
    path = "/tf-plugin-lib",
)

# To update the plugin lib for clients relying on a source set of *ES6 Modules*:
# Uncomment the following 2 rules. 'plugin_lib_srcs' generates es5 version only.
# > bazel build tensorboard/components/experimental/plugin_lib:tb_plugin_lib
# Then copy this folder
# cp -r ./bazel-bin/tensorboard/components/experimental/plugin_lib/tb_plugin_lib.es6/tensorboard/components/experimental/plugin_lib/* tensorboard/components/experimental/plugin_lib/dist
# into dist/
# and manually remove inlined sourcemaps.

# tf_ts_library(
#     name = "plugin_lib_srcs",
#     srcs = [
#         "message.ts",
#         "plugin-guest.ts",
#         "runs.ts",
#         "tf-plugin-lib.ts",
#     ],
# )

# tf_js_binary(
#     name = "tb_plugin_lib",
#     compile = 1,
#     entry_point = "tf-plugin-lib.ts",
#     deps = [
#         ":plugin_lib_srcs"
#     ]
# )
