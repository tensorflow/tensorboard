load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ng_web_test_suite")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "persistent_settings",
    srcs = [
        "index.ts",
        "persistent_settings_module.ts",
    ],
    deps = [
        ":config_module",
        "//tensorboard/webapp/persistent_settings/_data_source",
        "//tensorboard/webapp/persistent_settings/_data_source:types",
        "//tensorboard/webapp/persistent_settings/_redux:persistent_settings_actions",
        "//tensorboard/webapp/persistent_settings/_redux:persistent_settings_effects",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
    ],
)

tf_ng_module(
    name = "config_types",
    srcs = [
        "persistent_settings_config_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/persistent_settings/_data_source:types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
    ],
)

tf_ng_module(
    name = "config_module",
    srcs = [
        "persistent_settings_config_module.ts",
    ],
    deps = [
        ":config_types",
        "//tensorboard/webapp/persistent_settings/_data_source:types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
    ],
)

tf_ng_module(
    name = "config_module_test_lib",
    testonly = True,
    srcs = [
        "persistent_settings_config_module_test.ts",
    ],
    deps = [
        ":config_module",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/persistent_settings/_data_source:types",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)

tf_ng_web_test_suite(
    name = "karma_test",
    deps = [
        ":config_module_test_lib",
        "//tensorboard/webapp/persistent_settings/_data_source:_data_source_test_lib",
        "//tensorboard/webapp/persistent_settings/_redux:persistent_settings_effects_test_lib",
    ],
)
