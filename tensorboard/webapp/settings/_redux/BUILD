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
        #"//tensorboard/webapp:app_state",
        #"//tensorboard/webapp/angular:expect_angular_core_testing",
        #"//tensorboard/webapp/angular:expect_ngrx_store_testing",
        #"//tensorboard/webapp/core/testing",
        #"//tensorboard/webapp/notification_center/_data_source",
        #"//tensorboard/webapp/notification_center/_data_source:testing",
        #"//tensorboard/webapp/webapp_data_source:http_client_testing",
        #"@npm//@ngrx/effects",
        #"@npm//@ngrx/store",
        "@npm//@types/jasmine",
        #"@npm//rxjs",
    ],
)
