load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "annotations_list_component_styles",
    src = "annotations_list_component.scss",
    strict_deps = False,
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/theme",
    ],
)

tf_ng_module(
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
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_cdk_scrolling",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/plugins/npmi/actions",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/util:filter_annotations",
        "//tensorboard/webapp/plugins/npmi/util:metric_type",
        "//tensorboard/webapp/plugins/npmi/util:sort_annotations",
        "//tensorboard/webapp/plugins/npmi/views/annotations_list/annotation",
        "//tensorboard/webapp/plugins/npmi/views/annotations_list/annotations_list_toolbar",
        "//tensorboard/webapp/plugins/npmi/views/annotations_list/header",
        "//tensorboard/webapp/plugins/npmi/views/annotations_list/legend",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
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
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_cdk_scrolling",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/testing",
        "//tensorboard/webapp/plugins/npmi/util:filter_annotations",
        "//tensorboard/webapp/plugins/npmi/util:metric_type",
        "@npm//@angular/core",
        "@npm//@angular/forms",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
