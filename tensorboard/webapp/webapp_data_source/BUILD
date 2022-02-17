load("//tensorboard/defs:defs.bzl", "tf_ng_module")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "webapp_data_source",
    srcs = [
        "tb_server_data_source.ts",
        "tb_server_data_source_module.ts",
    ],
    deps = [
        ":http_client",
        "//tensorboard/webapp:tb_polymer_interop_types",
        "//tensorboard/webapp/core:types",
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "webapp_data_source_test_lib",
    testonly = True,
    srcs = [
        "tb_server_data_source_test.ts",
    ],
    deps = [
        ":http_client_testing",
        ":webapp_data_source",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/core:types",
        "@npm//@types/jasmine",
    ],
)

tf_ng_module(
    name = "http_client",
    srcs = [
        "tb_http_client.ts",
        "tb_http_client_module.ts",
        "tb_http_client_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_common_http",
        "//tensorboard/webapp/app_routing:app_root",
        "//tensorboard/webapp/feature_flag",
        "//tensorboard/webapp/feature_flag:types",
        "//tensorboard/webapp/feature_flag/store",
        "//tensorboard/webapp/feature_flag/store:types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "http_client_test",
    testonly = True,
    srcs = [
        "tb_http_client_test.ts",
    ],
    deps = [
        ":feature_flag_testing",
        ":http_client",
        ":http_client_testing",
        "//tensorboard/webapp/angular:expect_angular_common_http",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/app_routing:app_root",
        "//tensorboard/webapp/core:types",
        "//tensorboard/webapp/feature_flag/store",
        "//tensorboard/webapp/feature_flag/store:types",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)

tf_ng_module(
    name = "feature_flag_types",
    srcs = [
        "tb_feature_flag_data_source_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/feature_flag:types",
        "@npm//@angular/core",
    ],
)

tf_ng_module(
    name = "feature_flag",
    srcs = [
        "query_params.ts",
        "tb_feature_flag_data_source.ts",
        "tb_feature_flag_module.ts",
    ],
    deps = [
        ":feature_flag_types",
        "//tensorboard/webapp/feature_flag:types",
        "//tensorboard/webapp/types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "feature_flag_testing",
    testonly = True,
    srcs = [
        "tb_feature_flag_testing.ts",
    ],
    deps = [
        ":feature_flag_types",
        "//tensorboard/webapp/feature_flag:testing",
        "//tensorboard/webapp/feature_flag:types",
        "@npm//@angular/core",
    ],
)

tf_ng_module(
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

tf_ng_module(
    name = "http_client_testing",
    testonly = True,
    srcs = [
        "tb_http_client_testing.ts",
    ],
    deps = [
        ":http_client",
        "//tensorboard/webapp/angular:expect_angular_common_http_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/feature_flag/store:testing",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
    ],
)
