load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

ng_module(
    name = "metric_type",
    srcs = [
        "metric_type.ts",
    ],
    deps = [
        "//tensorboard/webapp/plugins/npmi/store:types",
    ],
)

ng_module(
    name = "filter_annotations",
    srcs = [
        "filter_annotations.ts",
    ],
    deps = [
        ":metric_type",
        "//tensorboard/webapp/plugins/npmi/store:types",
    ],
)

ng_module(
    name = "violin_data",
    srcs = [
        "violin_data.ts",
    ],
    deps = [
        ":metric_type",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/third_party:d3",
    ],
)

tf_ts_library(
    name = "violin_data_test_lib",
    testonly = True,
    srcs = ["violin_data_test.ts"],
    deps = [
        ":violin_data",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/runs",
        "//tensorboard/webapp/testing:mat_icon",
        "@npm//@angular/common",
        "@npm//@angular/compiler",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)

ng_module(
    name = "sort_annotations",
    srcs = [
        "sort_annotations.ts",
    ],
    deps = [
        ":metric_type",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/third_party:d3",
    ],
)

ng_module(
    name = "number_format",
    srcs = [
        "number_format.ts",
    ],
    deps = [
    ],
)
