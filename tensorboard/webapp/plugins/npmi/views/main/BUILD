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
        "//tensorboard/webapp/angular:expect_angular_material_checkbox",
        "//tensorboard/webapp/core:types",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/runs",
        "@npm//@angular/core",
        "@npm//@angular/forms",
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
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/runs",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
