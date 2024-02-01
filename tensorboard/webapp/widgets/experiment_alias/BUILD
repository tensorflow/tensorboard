load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_binary(
    name = "experiment_alias_component_styles",
    src = "experiment_alias_component.scss",
    deps = ["//tensorboard/webapp/theme"],
)

tf_ng_module(
    name = "experiment_alias",
    srcs = [
        "experiment_alias_component.ts",
        "experiment_alias_module.ts",
    ],
    assets = [
        ":experiment_alias_component_styles",
    ],
    deps = [
        "//tensorboard/webapp/experiments:types",
        "//tensorboard/webapp/widgets/content_wrapping_input",
        "@npm//@angular/common",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "experiment_alias_test",
    testonly = True,
    srcs = [
        "experiment_alias_test.ts",
    ],
    deps = [
        ":experiment_alias",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/experiments:types",
        "//tensorboard/webapp/testing:dom",
        "//tensorboard/webapp/widgets/content_wrapping_input",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@types/jasmine",
    ],
)
