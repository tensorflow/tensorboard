load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard/webapp/settings:__subpackages__"])

licenses(["notice"])

tf_ng_module(
    name = "_redux",
    srcs = [
        "settings_actions.ts",
        "settings_reducers.ts",
        "settings_selectors.ts",
        "settings_types.ts",
    ],
    visibility = ["//tensorboard:internal"],
    deps = [
        "@npm//@ngrx/store",
    ],
)
