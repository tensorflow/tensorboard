load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard/webapp/notification_center:__subpackages__"])

licenses(["notice"])

tf_ts_library(
    name = "_redux",
    srcs = [
        "notification_center_effects.ts",
        "notification_center_reducers.ts",
        "notification_center_selectors.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/notification_center:types",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "actions",
    srcs = [
        "notification_center_actions.ts",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "notification_center_types.ts",
    ],
    deps = [],
)

tf_ts_library(
    name = "_redux_test",
    testonly = True,
    srcs = [
        "notification_center_reducers_test.ts",
        "notification_center_selectors_test.ts",
    ],
    deps = [
        ":_redux",
        ":types",
    ],
)
