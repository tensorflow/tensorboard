load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "persistent_settings_actions",
    srcs = [
        "persistent_settings_actions.ts",
    ],
    deps = [
        "//tensorboard/webapp/persistent_settings/_data_source:types",
        "@npm//@ngrx/store",
    ],
)

tf_ng_module(
    name = "_redux",
    srcs = [
        "persistent_settings_effects.ts",
        "persistent_settings_reducers.ts",
        "persistent_settings_selectors.ts",
    ],
    deps = [
        ":persistent_settings_actions",
        ":types",
        "//tensorboard/webapp/app_routing/actions",
        "//tensorboard/webapp/persistent_settings:config_module",
        "//tensorboard/webapp/persistent_settings/_data_source",
        "//tensorboard/webapp/persistent_settings/_data_source:types",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "persistent_settings_types.ts",
    ],
)

tf_ts_library(
    name = "testing",
    testonly = True,
    srcs = [
        "testing.ts",
    ],
    deps = [
        ":types",
    ],
)

tf_ng_module(
    name = "_redux_test_lib",
    testonly = True,
    srcs = [
        "persistent_settings_effects_test.ts",
        "persistent_settings_selectors_test.ts",
    ],
    deps = [
        ":_redux",
        ":persistent_settings_actions",
        ":testing",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/app_routing:testing",
        "//tensorboard/webapp/app_routing/actions",
        "//tensorboard/webapp/persistent_settings:config_module",
        "//tensorboard/webapp/persistent_settings/_data_source:testing",
        "//tensorboard/webapp/testing:utils",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
