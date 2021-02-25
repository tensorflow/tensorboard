load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "data_source",
    srcs = [
        "npmi_data_source.ts",
        "npmi_data_source_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/plugins/npmi/store:types",
        "//tensorboard/webapp/plugins/npmi/util:metric_type",
        "//tensorboard/webapp/plugins/npmi/util:umap",
        "//tensorboard/webapp/webapp_data_source:http_client",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "data_source_test_lib",
    testonly = True,
    srcs = [
        "npmi_data_source_test.ts",
    ],
    deps = [
        ":data_source",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/plugins/npmi/testing",
        "//tensorboard/webapp/webapp_data_source:http_client_testing",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
