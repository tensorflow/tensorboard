load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_sass_binary(
    name = "annotations_list_component_styles",
    src = "annotations_list_component.scss",
)

ng_module(
    name = "annotations_list",
    srcs = [
        "annotations_list_component.ts",
        "annotations_list_container.ts",
        "annotations_list_module.ts",
    ],
    assets = [
        "annotations_list_component.ng.html",
        ":annotations_list_component_styles",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/util:filter_annotations",
        "//tensorboard/webapp/plugins/npmi/views/annotations_list/annotations_list_toolbar",
        "@npm//@angular/cdk",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//@types/d3",
        "@npm//d3",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "annotations_list_test_lib",
    testonly = True,
    srcs = [
        "annotations_list_test.ts",
    ],
    deps = [
        ":annotations_list",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/plugins/npmi/actions",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/testing",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
