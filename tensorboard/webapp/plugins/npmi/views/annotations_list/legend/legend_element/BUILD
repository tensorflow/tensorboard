load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "legend_element_component_styles",
    src = "legend_element_component.scss",
    strict_deps = False,
    deps = ["//tensorboard/webapp/theme"],
)

tf_ng_module(
    name = "legend_element",
    srcs = [
        "legend_element_component.ts",
        "legend_element_module.ts",
    ],
    assets = [
        "legend_element_component.ng.html",
        ":legend_element_component_styles",
    ],
    deps = [
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/plugins/npmi/store",
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/third_party:d3",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "legend_element_test_lib",
    testonly = True,
    srcs = [
        "legend_element_test.ts",
    ],
    deps = [
        ":legend_element",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/core/testing",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
