package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("@npm_bazel_jasmine//:index.bzl", "jasmine_node_test")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

tf_ts_library(
    name = "effects",
    srcs = [
        "core.effects.ts",
        "index.ts",
    ],
    deps = [
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/webapp_data_source",
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//@angular/compiler",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)


tf_ts_library(
    name = "core_effects_test_lib",
    testonly = True,
    srcs = [
        "core.effects.test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":effects",
        "//tensorboard/webapp/angular:expect_angular_common_http_testing",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/webapp_data_source",
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//@angular/compiler",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)

# TODO(soergel): make this test work
# This did not exist previously, and it fails due to an Angular injection issue.
# jasmine_node_test(
#     name = "core_effects_jasmine_test",
#     srcs = [
#         ":core_effects_test_lib",
#     ],
#     deps = [
#         "@npm//chai",
#         "@npm//sinon",
#     ],
# )
