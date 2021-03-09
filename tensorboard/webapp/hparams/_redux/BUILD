load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "hparams_types",
    srcs = [
        "hparams_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/hparams:types",
    ],
)

tf_ts_library(
    name = "hparams_actions",
    srcs = [
        "hparams_actions.ts",
    ],
    deps = [
        "//tensorboard/webapp/hparams:types",
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
        ":hparams_types",
        "//tensorboard/webapp/hparams:types",
        "//tensorboard/webapp/runs/actions",
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
        ":hparams_types",
        "//tensorboard/webapp/hparams:types",
        "//tensorboard/webapp/runs/actions",
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
        ":hparams_types",
        "//tensorboard/webapp/hparams:types",
    ],
)

tf_ts_library(
    name = "_redux_test_lib",
    testonly = True,
    srcs = [
        "hparams_reducers_test.ts",
        "hparams_selectors_test.ts",
    ],
    deps = [
        ":hparams_actions",
        ":hparams_reducers",
        ":hparams_selectors",
        ":testing",
        "//tensorboard/webapp/hparams:types",
        "//tensorboard/webapp/runs/actions",
        "//tensorboard/webapp/runs/data_source:testing",
        "//tensorboard/webapp/runs/store:testing",
        "@npm//@types/jasmine",
    ],
)
