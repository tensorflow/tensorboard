load("//tensorboard/defs:defs.bzl", "tf_js_binary", "tf_ts_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

# TODO(psybuzz): create a NPM package when a better requirement comes up using
# tf_js_binary.
tf_ts_library(
    name = "plugin_lib",
    srcs = [
        "core.ts",
        "index.ts",
        "message.ts",
        "plugin-guest.ts",
        "runs.ts",
    ],
)

tf_ts_library(
    name = "plugin_lib_polymer_interop_internal",
    srcs = [
        "polymer-interop.ts",
    ],
    deps = [
        ":plugin_lib",
    ],
)

tf_js_binary(
    name = "plugin_lib_polymer_interop_binary",
    compile = 1,
    entry_point = ":polymer-interop.ts",
    deps = [
        ":plugin_lib_polymer_interop_internal",
    ],
)

tf_web_library(
    name = "plugin_lib_polymer_interop",
    srcs = [
        "plugin_lib_polymer_interop_binary.js",
        "polymer-interop.html",
    ],
    path = "/tf-plugin-lib",
)
