load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

# TODO(psybuzz): create a NPM package when a better requirement comes up using
# tf_js_binary.
tf_ts_library(
    name = "plugin_lib",
    srcs = [
        "core.ts",
        "index.ts",
        "plugin-guest.ts",
        "runs.ts",
    ],
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/experimental/plugin_util:message",
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
