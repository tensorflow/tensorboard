load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "legend_component_styles",
    src = "legend_component.scss",
    strict_deps = False,
    deps = ["//tensorboard/webapp/theme"],
)

tf_ng_module(
    name = "legend",
    srcs = [
        "legend_component.ts",
        "legend_module.ts",
    ],
    assets = [
        "legend_component.ng.html",
        ":legend_component_styles",
    ],
    deps = [
        "//tensorboard/webapp/plugins/npmi/views/annotations_list/legend/legend_element",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "legend_test_lib",
    testonly = True,
    srcs = [
        "legend_test.ts",
    ],
    deps = [
        ":legend",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/core/testing",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
