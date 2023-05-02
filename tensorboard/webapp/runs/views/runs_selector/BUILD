load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "runs_selector",
    srcs = [
        "runs_selector_component.ts",
        "runs_selector_container.ts",
        "runs_selector_module.ts",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/runs/store:types",
        "//tensorboard/webapp/runs/views/runs_table",
        "//tensorboard/webapp/runs/views/runs_table:types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "runs_selector_test",
    testonly = True,
    srcs = [
        "runs_selector_test.ts",
    ],
    deps = [
        ":runs_selector",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/runs/store:testing",
        "//tensorboard/webapp/runs/views/runs_table",
        "//tensorboard/webapp/runs/views/runs_table:types",
        "//tensorboard/webapp/testing:utils",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
