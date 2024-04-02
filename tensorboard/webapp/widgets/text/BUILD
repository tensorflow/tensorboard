load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "truncated_path_styles",
    src = "truncated_path_component.scss",
)

tf_ng_module(
    name = "truncated_path",
    srcs = [
        "truncated_path_component.ts",
        "truncated_path_module.ts",
    ],
    assets = [
        ":truncated_path_styles",
    ],
    deps = [
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)

tf_ng_module(
    name = "text_tests",
    testonly = True,
    srcs = ["truncated_path_test.ts"],
    deps = [
        ":truncated_path",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
