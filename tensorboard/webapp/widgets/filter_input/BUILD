load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "filter_input_component_styles",
    src = "filter_input_component.scss",
    deps = ["//tensorboard/webapp/theme"],
)

tf_ng_module(
    name = "filter_input",
    srcs = [
        "filter_input_component.ts",
        "filter_input_module.ts",
    ],
    assets = [
        ":filter_input_component_styles",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_material_autocomplete",
        "//tensorboard/webapp/angular:expect_angular_material_icon",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "filter_input_test",
    testonly = True,
    srcs = [
        "filter_input_test.ts",
    ],
    deps = [
        ":filter_input",
        "//tensorboard/webapp/angular:expect_angular_cdk_overlay",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_autocomplete",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/testing:dom",
        "//tensorboard/webapp/testing:mat_icon",
        "//tensorboard/webapp/testing:material",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
