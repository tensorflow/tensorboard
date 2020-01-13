load("//tensorboard/defs:defs.bzl", "tf_ts_library", "tf_js_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

# TODO(psybuzz): create a NPM package when a better requirement comes up using
# tf_js_binary.
tf_ts_library(
    name = "plugin_lib",
    srcs = [
        "index.ts",
        "message.ts",
        "plugin-guest.ts",
        "core.ts",
        "runs.ts",
    ],
)

tf_js_binary(
    name = "plugin_lib_rollup",
    compile = 1,
    entry_point = "index.ts",
    deps = [
        ":plugin_lib",
    ],
)
