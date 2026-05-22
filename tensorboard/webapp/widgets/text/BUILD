load("@io_bazel_rules_sass//:defs.bzl", "sass_binary")
load("//tensorboard/defs:defs.bzl", "tf_ng_module")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

sass_binary(
    name = "truncated_path_styles",
    src = "truncated_path_component.scss",
    include_paths = ["external/npm/node_modules"],
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
