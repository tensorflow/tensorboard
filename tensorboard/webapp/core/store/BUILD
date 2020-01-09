package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

ng_module(
    name = "store",
    srcs = [
        "core_reducers.ts",
        "core_selectors.ts",
        "core_types.ts",
        "index.ts",
        "legacy_bootstrap.ts",
    ],
    deps = [
        "//tensorboard/webapp/webapp_data_source",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/types",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "core_store_test_lib",
    testonly = True,
    srcs = [
        "core_reducers_test.ts",
        "legacy_bootstrap_test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":store",
        "//tensorboard/webapp/angular:expect_angular_common_http_testing",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/webapp_data_source",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
