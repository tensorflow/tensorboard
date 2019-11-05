package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("@npm_bazel_jasmine//:index.bzl", "jasmine_node_test")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

ng_module(
    name = "core",
    srcs = [
        "actions/core.actions.ts",
        "actions/index.ts",
        "effects/core.effects.ts",
        "effects/index.ts",
        "core.module.ts",
        "store/core.reducers.ts",
        "store/core.selectors.ts",
        "store/core.types.ts",
        "store/index.ts",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_common_http",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/client",
        "@npm//@angular/common",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "core_effects_test_lib",
    testonly = True,
    srcs = [
        "effects/core.effects.test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":core",
        "//tensorboard/webapp/angular:expect_angular_common_http_testing",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/client",
        "//tensorboard/webapp/core/testing",
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

ng_module(
    name = "core_reducers_test_lib",
    testonly = True,
    srcs = [
        "store/core.reducers.test.ts",
    ],
    deps = [
        ":core",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/types",
        "@npm//@types/chai",
        "@npm//@types/jasmine",
        "@npm//@types/sinon",
        "@npm//chai",
        "@npm//sinon",
    ],
)

jasmine_node_test(
    name = "core_jasmine_test",
    srcs = [
        ":core_reducers_test_lib",
    ],
    deps = [
        "@npm//chai",
        "@npm//sinon",
    ],
)
