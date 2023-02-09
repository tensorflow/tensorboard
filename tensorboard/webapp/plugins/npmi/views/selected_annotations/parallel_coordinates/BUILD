load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "parallel_coordinates_component_styles",
    src = "parallel_coordinates_component.scss",
    strict_deps = False,
    deps = ["//tensorboard/webapp/theme"],
)

tf_ng_module(
    name = "parallel_coordinates",
    srcs = [
        "parallel_coordinates_component.ts",
        "parallel_coordinates_container.ts",
        "parallel_coordinates_module.ts",
    ],
    assets = [
        "parallel_coordinates_component.ng.html",
        ":parallel_coordinates_component_styles",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/util:coordinate_data",
        "//tensorboard/webapp/plugins/npmi/util:metric_type",
        "//tensorboard/webapp/third_party:d3",
        "//tensorboard/webapp/types:ui",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "parallel_coordinates_test_lib",
    testonly = True,
    srcs = [
        "parallel_coordinates_test.ts",
    ],
    deps = [
        ":parallel_coordinates",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/testing",
        "//tensorboard/webapp/runs_legacy",
        "//tensorboard/webapp/types:ui",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
