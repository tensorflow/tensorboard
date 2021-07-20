load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "feature_flag",
    srcs = [
        "feature_flag_module.ts",
    ],
    deps = [
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

tf_ts_library(
    name = "types",
    srcs = [
        "types.ts",
    ],
)

tf_ts_library(
    name = "testing",
    testonly = True,
    srcs = ["testing.ts"],
    deps = [":types"],
)
