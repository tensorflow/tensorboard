load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_sass_binary(
    name = "range_input_styles",
    src = "range_input_component.scss",
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/theme",
    ],
)

tf_ng_module(
    name = "range_input",
    srcs = [
        "range_input_component.ts",
        "range_input_module.ts",
    ],
    assets = [
        ":range_input_styles",
        "range_input_component.ng.html",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/angular:expect_angular_cdk_drag_drop",
        "//tensorboard/webapp/angular:expect_angular_material_slider",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@angular/forms",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "types.ts",
    ],
)

tf_ts_library(
    name = "range_input_tests",
    testonly = True,
    srcs = ["range_input_test.ts"],
    deps = [
        ":range_input",
        ":types",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_material_slider",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "@npm//@angular/core",
        "@npm//@angular/forms",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
