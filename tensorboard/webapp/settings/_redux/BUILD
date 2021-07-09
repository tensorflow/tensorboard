load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard/webapp/settings:__subpackages__"])

licenses(["notice"])

tf_ts_library(
    name = "types",
    srcs = [
        "settings_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/types",
    ],
)

tf_ng_module(
    name = "_redux",
    srcs = [
        "settings_actions.ts",
        "settings_effects.ts",
        "settings_reducers.ts",
        "settings_selectors.ts",
    ],
    visibility = ["//tensorboard:internal"],
    deps = [
        ":types",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/settings/_data_source",
        "//tensorboard/webapp/types",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "_redux_test",
    testonly = True,
    srcs = [
        "settings_effects_test.ts",
        "settings_reducers_test.ts",
    ],
    visibility = ["//tensorboard:internal"],
    deps = [
      ":types",
        ":_redux",
        "//tensorboard/webapp/settings:testing",
        "//tensorboard/webapp/settings/_data_source",
        "//tensorboard/webapp/types",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
