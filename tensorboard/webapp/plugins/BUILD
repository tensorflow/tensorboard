load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "plugins_component_styles",
    src = "plugins_component.scss",
    deps = ["//tensorboard/webapp/theme"],
)

tf_ng_module(
    name = "plugins",
    srcs = [
        "plugins_component.ts",
        "plugins_container.ts",
        "plugins_module.ts",
    ],
    assets = [
        ":plugins_component_styles",
        "plugins_component.ng.html",
    ],
    deps = [
        ":plugin_registry",
        "//tensorboard/components/experimental/plugin_util:plugin_host",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/core",
        "//tensorboard/webapp/core:types",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/feature_flag:types",
        "//tensorboard/webapp/feature_flag/store",
        "//tensorboard/webapp/settings",
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ng_module(
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
    deps = [
        ":plugin_registry",
        ":plugins",
        "//tensorboard/components/experimental/plugin_util:testing",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/testing",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/core",
        "//tensorboard/webapp/core:types",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/feature_flag:testing",
        "//tensorboard/webapp/feature_flag/store",
        "//tensorboard/webapp/plugins/testing",
        "//tensorboard/webapp/settings",
        "//tensorboard/webapp/testing:utils",
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
