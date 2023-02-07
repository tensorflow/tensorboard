load("//tensorboard/defs:defs.bzl", "tf_ng_module")

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
    name = "persistent_settings_effects",
    srcs = [
        "persistent_settings_effects.ts",
    ],
    deps = [
        ":persistent_settings_actions",
        "//tensorboard/webapp/persistent_settings:config_module",
        "//tensorboard/webapp/persistent_settings/_data_source",
        "//tensorboard/webapp/persistent_settings/_data_source:types",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "persistent_settings_effects_test_lib",
    testonly = True,
    srcs = [
        "persistent_settings_effects_test.ts",
    ],
    deps = [
        ":persistent_settings_actions",
        ":persistent_settings_effects",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/persistent_settings:config_module",
        "//tensorboard/webapp/persistent_settings/_data_source:testing",
        "//tensorboard/webapp/testing:utils",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
