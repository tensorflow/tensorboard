load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard/webapp/notification_center:__subpackages__"])

licenses(["notice"])

tf_ng_module(
    name = "_redux",
    srcs = [
        "notification_center_effects.ts",
        "notification_center_reducers.ts",
        "notification_center_selectors.ts",
    ],
    visibility = ["//tensorboard:internal"],
    deps = [
        ":actions",
        ":types",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/notification_center:types",
        "//tensorboard/webapp/notification_center/_data_source",
        "//tensorboard/webapp/persistent_settings",
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
        "//tensorboard/webapp/notification_center/_data_source:types",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "notification_center_types.ts",
    ],
    visibility = ["//tensorboard:internal"],
    deps = [
        "//tensorboard/webapp/notification_center/_data_source:types",
    ],
)

tf_ts_library(
    name = "testing",
    testonly = True,
    srcs = [
        "testing.ts",
    ],
    visibility = ["//tensorboard/webapp/testing:__subpackages__"],
    deps = [
        ":types",
    ],
)

tf_ts_library(
    name = "_redux_test",
    testonly = True,
    srcs = [
        "notification_center_effects_test.ts",
        "notification_center_reducers_test.ts",
        "notification_center_selectors_test.ts",
    ],
    deps = [
        ":_redux",
        ":actions",
        ":testing",
        ":types",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/notification_center/_data_source",
        "//tensorboard/webapp/notification_center/_data_source:testing",
        "//tensorboard/webapp/persistent_settings",
        "//tensorboard/webapp/testing:utils",
        "//tensorboard/webapp/webapp_data_source:http_client_testing",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
