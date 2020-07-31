load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_sass_binary", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_sass_binary(
    name = "main_component_styles",
    src = "main_component.scss",
)

ng_module(
    name = "main",
    srcs = [
        "main_component.ts",
        "main_container.ts",
        "main_module.ts",
    ],
    assets = [
        ":main_component_styles",
        "main_component.ng.html",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/runs",
        "@npm//@angular/core",
        "@npm//@angular/material",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "main_test_lib",
    testonly = True,
    srcs = [
        "main_container_test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":main",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/runs",
        "@npm//@angular/core",
        "@npm//@angular/material",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
