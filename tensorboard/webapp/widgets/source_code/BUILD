load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "source_code",
    srcs = [
        "editor_options.ts",
        "source_code_component.ts",
        "source_code_container.ts",
        "source_code_diff_component.ts",
        "source_code_diff_container.ts",
        "source_code_module.ts",
    ],
    assets = [
        "source_code_component.css",
        "source_code_component.ng.html",
    ],
    deps = [
        ":load_monaco",
        "//tensorboard/webapp/widgets:resize_detector",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//monaco-editor-core",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "load_monaco",
    srcs = [
        "load_monaco_shim.ts",
    ],
    deps = [
        "@npm//@types/requirejs",
    ],
)

tf_ts_library(
    name = "source_code_test_lib",
    testonly = True,
    srcs = [
        "load_monaco_shim_test.ts",
    ],
    deps = [
        ":load_monaco",
        "@npm//@types/jasmine",
        "@npm//@types/requirejs",
    ],
)

tf_ts_library(
    name = "testing",
    srcs = [
        "testing.ts",
    ],
    deps = [
        ":load_monaco",
        "@npm//@types/jasmine",
    ],
)

tf_ts_library(
    name = "source_code_container_test_lib",
    testonly = True,
    srcs = [
        "source_code_container_test.ts",
        "source_code_diff_container_test.ts",
    ],
    deps = [
        ":load_monaco",
        ":source_code",
        ":testing",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "@npm//@angular/core",
        "@npm//@types/jasmine",
    ],
)
