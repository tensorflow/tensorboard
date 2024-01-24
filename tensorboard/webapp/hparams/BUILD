load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ng_web_test_suite", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "types",
    srcs = [
        "types.ts",
    ],
    deps = [
        ":_types",
        "//tensorboard/webapp/hparams/_redux:types",
    ],
)

tf_ts_library(
    name = "_types",
    srcs = [
        "_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/runs/data_source",
        "//tensorboard/webapp/runs/data_source:backend_types",
        "//tensorboard/webapp/widgets/data_table:types",
    ],
)

tf_ng_module(
    name = "hparams",
    srcs = [
        "hparams_module.ts",
        "index.ts",
    ],
    deps = [
        "//tensorboard/webapp/hparams/_redux:hparams_actions",
        "//tensorboard/webapp/hparams/_redux:hparams_module",
        "//tensorboard/webapp/hparams/_redux:hparams_selectors",
        "//tensorboard/webapp/persistent_settings:config_module",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "testing",
    testonly = True,
    srcs = [
        "testing.ts",
    ],
    deps = [
        "//tensorboard/webapp/hparams/_redux:testing",
    ],
)

tf_ng_web_test_suite(
    name = "karma_test",
    deps = [
        "//tensorboard/webapp/hparams/_redux:_redux_test_lib",
    ],
)
