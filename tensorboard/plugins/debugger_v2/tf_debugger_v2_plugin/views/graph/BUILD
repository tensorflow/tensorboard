load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "graph_styles",
    src = "graph_component.scss",
    deps = [
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/common:style_lib",
        "//tensorboard/webapp/theme",
    ],
)

tf_sass_binary(
    name = "graph_op_styles",
    src = "graph_op_component.scss",
    deps = [
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/views/common:style_lib",
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/theme",
    ],
)

tf_ng_module(
    name = "graph",
    srcs = [
        "graph_component.ts",
        "graph_container.ts",
        "graph_module.ts",
        "graph_op_component.ts",
    ],
    assets = [
        ":graph_op_styles",
        ":graph_styles",
        "graph_component.ng.html",
        "graph_op_component.ng.html",
    ],
    deps = [
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/actions",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store:types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "graph_container_test_lib",
    testonly = True,
    srcs = [
        "graph_container_test.ts",
    ],
    deps = [
        ":graph",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin:debugger_v2",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/actions",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store:types",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/testing",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
