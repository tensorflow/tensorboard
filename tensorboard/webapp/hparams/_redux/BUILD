load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "utils",
    srcs = [
        "utils.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/hparams:types",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "types.ts",
    ],
    deps = [
        "//tensorboard/webapp/hparams:_types",
    ],
)

tf_ng_module(
    name = "hparams_module",
    srcs = [
        "hparams_module.ts",
    ],
    deps = [
        ":hparams_data_source",
        ":hparams_effects",
        ":hparams_reducers",
        ":types",
        "//tensorboard/webapp/hparams:types",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "hparams_actions",
    srcs = [
        "hparams_actions.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/hparams:types",
        "//tensorboard/webapp/widgets/data_table:types",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "hparams_reducers",
    srcs = [
        "hparams_reducers.ts",
    ],
    deps = [
        ":hparams_actions",
        ":types",
        ":utils",
        "//tensorboard/webapp/hparams:_types",
        "//tensorboard/webapp/persistent_settings",
        "//tensorboard/webapp/runs/actions",
        "//tensorboard/webapp/widgets/data_table:types",
        "//tensorboard/webapp/widgets/data_table:utils",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "hparams_selectors",
    srcs = [
        "hparams_selectors.ts",
    ],
    deps = [
        ":hparams_actions",
        ":types",
        ":utils",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/hparams:types",
        "//tensorboard/webapp/runs/actions",
        "@npm//@ngrx/store",
    ],
)

tf_ng_module(
    name = "hparams_data_source",
    srcs = [
        "hparams_data_source.ts",
    ],
    deps = [
        "//tensorboard/webapp/hparams:types",
        "//tensorboard/webapp/webapp_data_source:http_client",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "hparams_effects",
    srcs = [
        "hparams_effects.ts",
    ],
    deps = [
        ":hparams_actions",
        ":hparams_data_source",
        ":hparams_selectors",
        ":types",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/app_routing/actions",
        "//tensorboard/webapp/app_routing/store",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/feature_flag/store",
        "//tensorboard/webapp/hparams:types",
        "//tensorboard/webapp/runs/actions",
        "//tensorboard/webapp/webapp_data_source:http_client",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//rxjs",
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
        ":utils",
        "//tensorboard/webapp/hparams:_types",
        "//tensorboard/webapp/util:types",
    ],
)

tf_ts_library(
    name = "_redux_test_lib",
    testonly = True,
    srcs = [
        "hparams_data_source_test.ts",
        "hparams_effects_test.ts",
        "hparams_reducers_test.ts",
        "hparams_selectors_test.ts",
        "utils_test.ts",
    ],
    deps = [
        ":hparams_actions",
        ":hparams_data_source",
        ":hparams_effects",
        ":hparams_reducers",
        ":hparams_selectors",
        ":testing",
        ":types",
        ":utils",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/app_routing/actions",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/hparams:types",
        "//tensorboard/webapp/persistent_settings",
        "//tensorboard/webapp/runs/actions",
        "//tensorboard/webapp/runs/data_source:testing",
        "//tensorboard/webapp/runs/store:testing",
        "//tensorboard/webapp/testing:utils",
        "//tensorboard/webapp/util:types",
        "//tensorboard/webapp/webapp_data_source:http_client_testing",
        "//tensorboard/webapp/widgets/data_table:types",
        "//tensorboard/webapp/widgets/data_table:utils",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
