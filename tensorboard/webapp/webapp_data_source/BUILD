package(default_visibility = ["//tensorboard:internal"])

load("@npm_angular_bazel//:index.bzl", "ng_module")

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
