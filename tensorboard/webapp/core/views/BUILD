load("@npm_angular_bazel//:index.bzl", "ng_module")
load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

ng_module(
    name = "hash_storage",
    srcs = [
        "hash_storage_component.ts",
        "hash_storage_container.ts",
        "hash_storage_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/store",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "test_lib",
    testonly = True,
    srcs = [
        "hash_storage_test.ts",
    ],
    tsconfig = "//:tsconfig-test",
    deps = [
        ":hash_storage",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_angular_platform_browser_animations",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/core/testing",
        "@npm//@angular/common",
        "@npm//@angular/compiler",
        "@npm//@angular/core",
        "@npm//@angular/platform-browser",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
