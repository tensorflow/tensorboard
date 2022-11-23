load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "metric_type",
    srcs = [
        "metric_type.ts",
    ],
)

tf_ts_library(
    name = "metric_type_test_lib",
    testonly = True,
    srcs = ["metric_type_test.ts"],
    deps = [
        ":metric_type",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/core/testing",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "filter_annotations",
    srcs = [
        "filter_annotations.ts",
    ],
    deps = [
        ":metric_type",
        "//tensorboard/webapp/plugins/npmi/store:types",
    ],
)

tf_ts_library(
    name = "filter_annotations_test_lib",
    testonly = True,
    srcs = ["filter_annotations_test.ts"],
    deps = [
        ":filter_annotations",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/testing",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)

tf_ng_module(
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
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/testing",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)

tf_ng_module(
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

tf_ts_library(
    name = "sort_annotations_test_lib",
    testonly = True,
    srcs = ["sort_annotations_test.ts"],
    deps = [
        ":sort_annotations",
        ":umap",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/testing",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "coordinate_data",
    srcs = [
        "coordinate_data.ts",
    ],
    deps = [
        "//tensorboard/webapp/plugins/npmi/store:types",
    ],
)

tf_ts_library(
    name = "coordinate_data_test_lib",
    testonly = True,
    srcs = ["coordinate_data_test.ts"],
    deps = [
        ":coordinate_data",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/testing",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "csv_result",
    srcs = [
        "csv_result.ts",
    ],
    deps = [
        ":metric_type",
        "//tensorboard/webapp/plugins/npmi/store:types",
    ],
)

tf_ts_library(
    name = "csv_result_test_lib",
    testonly = True,
    srcs = ["csv_result_test.ts"],
    deps = [
        ":csv_result",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "umap",
    srcs = [
        "umap.ts",
    ],
    strict_checks = False,
    deps = [
        "@npm//umap-js",
    ],
)

tf_ts_library(
    name = "umap_test_lib",
    testonly = True,
    srcs = ["umap_test.ts"],
    deps = [
        ":umap",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/plugins/npmi/testing",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
