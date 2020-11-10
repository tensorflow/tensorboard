load("//tensorboard/defs:defs.bzl", "tf_ng_module")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "deeplink",
    srcs = [
        "deeplink_module.ts",
        "hash.ts",
        "index.ts",
        "types.ts",
    ],
    deps = [
        "@npm//@angular/core",
    ],
)

tf_ng_module(
    name = "deeplink_test_lib",
    testonly = True,
    srcs = [
        "deeplink_test.ts",
    ],
    deps = [
        ":deeplink",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "@npm//@types/jasmine",
    ],
)
