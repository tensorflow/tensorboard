load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard/webapp/notification_center:__subpackages__"])

licenses(["notice"])

tf_ts_library(
    name = "_redux",
    srcs = [
        "notification_center_reducers.ts",
        "notification_center_selectors.ts",
        "notification_center_effects.ts",
        "notification_center_actions.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/notification_center:types",
        "//tensorboard/webapp:app_state",
        "@npm//@ngrx/store",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//rxjs",
    ],
)


tf_ts_library(
    name = "types",
    srcs = [
        "notification_center_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/notification_center:types",
    ],
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
        "@npm//@types/jasmine",
    ],
)

