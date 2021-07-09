load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ng_module(
    name = "_data_source",
    srcs = [
        "settings_data_source.ts",
        "settings_data_source_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/settings/_redux:types",
        "@npm//@angular/core",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "test_lib",
    testonly = True,
    srcs = [
        "settings_data_source_test.ts",
    ],
    deps = [
        ":_data_source",
        "@npm//@angular/core",
        "@npm//@types/jasmine",
    ],
)
