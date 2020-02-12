load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ng_web_test_suite", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

# TODO(cais): Consider replacing old debuger plugin with this before launch,
# instead of having two versions of debugger co-exist, which may be confusing to
# users.
ng_module(
    name = "debugger_v2",
    srcs = [
        "debugger_component.ts",
        "debugger_container.ts",
        "debugger_module.ts",
    ],
    assets = [
        "debugger_component.css",
        "debugger_component.ng.html",
    ],
    deps = [
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/actions",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/data_source",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/effects",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store:types",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/alerts",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/inactive",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/stack_trace",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/timeline",
        "//tensorboard/webapp/plugins:plugin_registry",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "test_lib",
    testonly = True,
    srcs = [
        "debugger_container_test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":debugger_v2",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/actions",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store:types",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/testing",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/alerts",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/execution_data",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/inactive",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/stack_trace",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/timeline",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "@npm//@angular/common",
        "@npm//@angular/compiler",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)

tf_ng_web_test_suite(
    name = "karma_test",
    deps = [
        ":test_lib",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/effects:debugger_effects_test_lib",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store:debugger_store_test_lib",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/alerts:alerts_container_test_lib",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/timeline:timeline_test",
    ],
)
