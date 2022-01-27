load("//tensorboard/defs:defs.bzl", "tf_ng_module")

package(default_visibility = ["//tensorboard:internal"])

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
