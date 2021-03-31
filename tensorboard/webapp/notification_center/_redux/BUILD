load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard/webapp/notification_center:__subpackages__"])

licenses(["notice"])

tf_ts_library(
    name = "_redux",
    srcs = [
        "notification_center_effects.ts",
        "notification_center_reducers.ts",
        "notification_center_selectors.ts",
        "notification_notes.ts",
    ],
    visibility = ["//tensorboard:internal"],
    deps = [
        ":actions",
        ":types",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/notification_center:types",
        "//tensorboard/webapp/notification_center/data_source",
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
    deps = [
        ":types",
        "//tensorboard/webapp/notification_center/data_source:types",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "notification_center_types.ts",
    ],
    visibility = ["//tensorboard:internal"],
    deps = [],
)

tf_ts_library(
    name = "testing",
    testonly = True,
    srcs = [
        "testing.ts",
    ],
    deps = [
        ":_redux",
        ":types",
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
        ":actions",
        ":testing",
        ":types",
        "@npm//@types/jasmine",
    ],
)
