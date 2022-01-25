load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "feature_flag",
    srcs = [
        "feature_flag_module.ts",
    ],
    deps = [
        ":force_svg_data_source",
        "//tensorboard/webapp/feature_flag/effects",
        "//tensorboard/webapp/feature_flag/store",
        "//tensorboard/webapp/feature_flag/store:types",
        "//tensorboard/webapp/persistent_settings",
        "//tensorboard/webapp/webapp_data_source:feature_flag",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
    ],
)

tf_ng_module(
    name = "force_svg_data_source",
    srcs = [
        "force_svg_data_source.ts",
        "force_svg_data_source_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/webapp_data_source:feature_flag_types",
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "types.ts",
    ],
)

tf_ts_library(
    name = "testing",
    testonly = True,
    srcs = [
        "force_svg_data_source_test.ts",
        "testing.ts",
    ],
    deps = [
        ":force_svg_data_source",
        ":types",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/webapp_data_source:feature_flag_types",
        "@npm//@types/jasmine",
    ],
)
