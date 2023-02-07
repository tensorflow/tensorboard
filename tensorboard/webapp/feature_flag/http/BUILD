load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ts_library(
    name = "const",
    srcs = [
        "const.ts",
    ],
)

tf_ng_module(
    name = "http",
    srcs = [
        "feature_flag_http_interceptor.ts",
    ],
    deps = [
        ":const",
        "//tensorboard/webapp/angular:expect_angular_common_http",
        "//tensorboard/webapp/feature_flag:types",
        "//tensorboard/webapp/feature_flag/store",
        "//tensorboard/webapp/feature_flag/store:types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "http_test_lib",
    testonly = True,
    srcs = [
        "feature_flag_http_interceptor_test.ts",
    ],
    deps = [
        ":const",
        ":http",
        "//tensorboard/webapp/angular:expect_angular_common_http",
        "//tensorboard/webapp/angular:expect_angular_common_http_testing",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/feature_flag:testing",
        "//tensorboard/webapp/feature_flag:types",
        "//tensorboard/webapp/feature_flag/store",
        "//tensorboard/webapp/feature_flag/store:types",
        "//tensorboard/webapp/testing:utils",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
