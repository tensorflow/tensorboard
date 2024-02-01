load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_sass_binary(
    name = "content_wrapping_input_component_styles",
    src = "content_wrapping_input_component.scss",
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
        "//tensorboard/webapp/theme",
    ],
)

tf_ng_module(
    name = "content_wrapping_input",
    srcs = [
        "content_wrapping_input_component.ts",
        "content_wrapping_input_module.ts",
    ],
    assets = [
        ":content_wrapping_input_component_styles",
    ],
    deps = [
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "content_wrapping_input_tests",
    testonly = True,
    srcs = ["content_wrapping_input_test.ts"],
    deps = [
        ":content_wrapping_input",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/testing:dom",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
