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
        "//tensorboard/webapp/types",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "_redux_test",
    testonly = True,
    srcs = [
        "settings_reducers_test.ts",
    ],
    visibility = ["//tensorboard:internal"],
    deps = [
        ":_redux",
        "//tensorboard/webapp/settings:testing",
        "@npm//@types/jasmine",
    ],
)
