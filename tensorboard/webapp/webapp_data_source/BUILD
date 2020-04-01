load("@npm_angular_bazel//:index.bzl", "ng_module")

package(default_visibility = ["//tensorboard:internal"])

ng_module(
    name = "webapp_data_source",
    srcs = [
        "tb_server_data_source.ts",
        "tb_server_data_source_module.ts",
    ],
    deps = [
        ":http_client",
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)

ng_module(
    name = "webapp_data_source_test_lib",
    testonly = True,
    srcs = [
        "tb_server_data_source_test.ts",
    ],
    deps = [
        ":http_client_testing",
        ":webapp_data_source",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "@npm//@types/jasmine",
    ],
)

ng_module(
    name = "http_client",
    srcs = [
        "tb_http_client.ts",
        "tb_http_client_module.ts",
        "tb_http_client_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_common_http",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)

ng_module(
    name = "feature_flag",
    srcs = [
        "tb_feature_flag_data_source.ts",
        "tb_feature_flag_data_source_types.ts",
        "tb_feature_flag_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)

ng_module(
    name = "feature_flag_testing",
    testonly = True,
    srcs = [
        "tb_feature_flag_testing.ts",
    ],
    deps = [
        ":feature_flag",
        "@npm//@angular/core",
    ],
)

ng_module(
    name = "feature_flag_test_lib",
    testonly = True,
    srcs = [
        "tb_feature_flag_data_source_test.ts",
    ],
    deps = [
        ":feature_flag",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "@npm//@angular/core",
        "@npm//@types/jasmine",
    ],
)

ng_module(
    name = "http_client_testing",
    testonly = True,
    srcs = [
        "tb_http_client_testing.ts",
    ],
    deps = [
        ":http_client",
        "//tensorboard/webapp/angular:expect_angular_common_http_testing",
        "@npm//@angular/core",
    ],
)
