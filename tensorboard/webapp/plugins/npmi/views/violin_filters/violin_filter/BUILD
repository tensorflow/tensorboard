load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "violin_filter_component_styles",
    src = "violin_filter_component.scss",
)

ng_module(
    name = "violin_filter",
    srcs = [
        "violin_filter_component.ts",
        "violin_filter_container.ts",
        "violin_filter_module.ts",
    ],
    assets = [
        "violin_filter_component.ng.html",
        ":violin_filter_component_styles",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/angular:expect_angular_material_button",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/plugins/npmi/actions",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/util:filter_annotations",
        "//tensorboard/webapp/plugins/npmi/util:violin_data",
        "//tensorboard/webapp/third_party:d3",
        "@npm//@angular/core",
        "@npm//@angular/forms",
        "@npm//@ngrx/store",
        "@npm//@types/d3",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "violin_filter_test_lib",
    testonly = True,
    srcs = [
        "violin_filter_test.ts",
    ],
    deps = [
        ":violin_filter",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/plugins/npmi/actions",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/testing",
        "//tensorboard/webapp/runs",
        "//tensorboard/webapp/testing:mat_icon",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
