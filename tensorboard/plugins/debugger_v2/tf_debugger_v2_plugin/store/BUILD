package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

ng_module(
    name = "store",
    srcs = [
        "debugger_reducers.ts",
        "debugger_selectors.ts",
        "debugger_store_utils.ts",
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

ng_module(
    name = "debug_tensor_value",
    srcs = [
        "debug_tensor_value.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin:tf_types",
    ],
)

tf_ts_library(
    name = "debugger_store_test_lib",
    testonly = True,
    srcs = [
        "debug_tensor_value_test.ts",
        "debugger_graphs_reducers_test.ts",
        "debugger_reducers_test.ts",
        "debugger_selectors_test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":debug_tensor_value",
        ":store",
        ":types",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/actions",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/data_source",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/testing",
        "@npm//@types/jasmine",
    ],
)
