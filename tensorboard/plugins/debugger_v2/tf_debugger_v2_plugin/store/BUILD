package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

ng_module(
    name = "store",
    srcs = [
        "debugger_reducers.ts",
        "debugger_selectors.ts",
        "index.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/actions",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/data_source",
        "@npm//@ngrx/store",
    ],
)

ng_module(
    name = "types",
    srcs = [
        "debugger_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/types",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "debugger_store_test_lib",
    testonly = True,
    srcs = [
        "debugger_reducers_test.ts",
        "debugger_selectors_test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":store",
        ":types",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/actions",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/data_source",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/testing",
        "@npm//@types/jasmine",
    ],
)
