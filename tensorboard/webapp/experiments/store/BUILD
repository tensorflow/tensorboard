load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "store",
    srcs = [
        "experiments_reducers.ts",
        "index.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/experiments:types",
        "//tensorboard/webapp/types",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "selectors",
    srcs = [
        "experiments_selectors.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/app_routing/store",
        "//tensorboard/webapp/experiments:types",
        "//tensorboard/webapp/types",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "experiments_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/experiments:types",
        "//tensorboard/webapp/types",
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
        "//tensorboard/webapp/experiments:types",
    ],
)

tf_ts_library(
    name = "store_test_lib",
    testonly = True,
    srcs = [
        "experiments_selectors_test.ts",
    ],
    deps = [
        ":selectors",
        ":testing",
        ":types",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/app_routing/store:testing",
        "//tensorboard/webapp/testing:utils",
        "//tensorboard/webapp/types",
        "@npm//@types/jasmine",
    ],
)
