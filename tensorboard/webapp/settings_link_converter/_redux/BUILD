load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard/webapp/settings_link_converter:__subpackages__"])

licenses(["notice"])

tf_ts_library(
    name = "actions",
    srcs = [
        "settings_link_converter_actions.ts",
    ],
    deps = [
        ":types",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "settings_link_converter_types.ts",
    ],
    visibility = ["//tensorboard:internal"],
)
