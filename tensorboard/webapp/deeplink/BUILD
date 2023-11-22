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
        "//tensorboard/webapp:tb_polymer_interop_types",
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
        "//tensorboard/webapp:tb_polymer_interop_types",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "@npm//@types/jasmine",
    ],
)

tf_ng_module(
    name = "testing",
    srcs = [
        "testing.ts",
    ],
    deps = [
        ":deeplink",
        "@npm//@angular/core",
    ],
)
