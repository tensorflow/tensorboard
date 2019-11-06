package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("@npm_bazel_jasmine//:index.bzl", "jasmine_node_test")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

ng_module(
    name = "store",
    srcs = [
        "core.reducers.ts",
        "core.selectors.ts",
        "core.types.ts",
        "index.ts",
    ],
    deps = [
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
        "core.reducers.test.ts",
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
        "@npm//@angular/compiler",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//@types/chai",
        "@npm//@types/jasmine",
        "@npm//@types/sinon",
        "@npm//rxjs",
        "@npm//chai",
        "@npm//sinon",
    ],
)

jasmine_node_test(
    name = "core_store_jasmine_test",
    srcs = [
        ":core_store_test_lib",
    ],
    deps = [
        "@npm//chai",
        "@npm//sinon",
    ],
)
