load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

ng_module(
    name = "plugins",
    srcs = [
        "plugins_component.ts",
        "plugins_container.ts",
        "plugins_module.ts",
    ],
    assets = [
        "plugins_component.ng.html",
    ],
    deps = [
        ":plugin_registry",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin:debugger_v2",
        "//tensorboard/webapp/core",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

ng_module(
    name = "plugin_registry",
    srcs = [
        "plugin_registry_module.ts",
        "plugin_registry_types.ts",
    ],
    deps = [
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "plugins_container_test_lib",
    testonly = True,
    srcs = [
        "plugins_container_test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":plugin_registry",
        ":plugins",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/testing",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/core",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/plugins/testing",
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//@angular/compiler",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
