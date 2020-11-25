load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "data_source",
    srcs = [
        "index.ts",
        "text_v2_data_source.ts",
        "text_v2_data_source_module.ts",
        "text_v2_server_data_source.ts",
    ],
    deps = [
        "//tensorboard/webapp/webapp_data_source:http_client",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "data_source_test_lib",
    testonly = True,
    srcs = [
        "text_v2_data_source_test.ts",
    ],
    deps = [
        ":data_source",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/webapp_data_source:http_client_testing",
        "@npm//@types/jasmine",
    ],
)
