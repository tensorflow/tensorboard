package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")
load("@npm_bazel_jasmine//:index.bzl", "jasmine_node_test")
load("@npm_bazel_typescript//:defs.bzl", "ts_library")

ng_module(
    name = "core",
    srcs = [
        "core.actions.ts",
        "core.effects.ts",
        "core.module.ts",
        "core.reducers.ts",
        "core.service.ts",
    ],
    deps = [
        "//tensorboard/components/tf_ng_tensorboard/types",
        "@npm//@angular/common",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
    ],
)

ts_library(
    name = "core_effects_test_lib",
    testonly = True,
    srcs = [
        "core.effects.test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":core",
        "//tensorboard/components/tf_ng_tensorboard/types",
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
        "core.reducers.test.ts",
    ],
    deps = [
        ":core",
        "@npm//@types/jasmine",
        "@npm//chai",
    ],
)

jasmine_node_test(
    name = "core_jasmine_test",
    deps = [
        ":core_reducers_test_lib",
    ],
)
