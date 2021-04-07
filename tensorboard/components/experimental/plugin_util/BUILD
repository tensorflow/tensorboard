load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ng_web_test_suite", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "message",
    srcs = [
        "message.ts",
    ],
)

tf_ts_library(
    name = "message_types",
    srcs = [
        "message_types.ts",
    ],
)

tf_ng_module(
    name = "host_internals",
    srcs = [
        "plugin-host-ipc.ts",
    ],
    deps = [
        ":message",
        "@npm//@angular/core",
    ],
)

tf_ng_module(
    name = "plugin_host",
    srcs = [
        "core-host-impl.ts",
        "plugin_api_host_module.ts",
        "runs-host-impl.ts",
    ],
    deps = [
        ":host_internals",
        ":message_types",
        "//tensorboard/components/tf_storage",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "plugin_host_test",
    testonly = True,
    srcs = [
        "plugin_api_host_test.ts",
    ],
    deps = [
        ":host_internals",
        ":message",
        ":message_types",
        ":plugin_host",
        "//tensorboard/components/tf_storage",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/runs/store:testing",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)

tf_ng_web_test_suite(
    name = "karma_test",
    deps = [
        ":plugin_host_test",
    ],
)
