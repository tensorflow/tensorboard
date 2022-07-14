load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "store",
    srcs = [
        "feature_flag_reducers.ts",
        "feature_flag_selectors.ts",
        "feature_flag_store_config_provider.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/feature_flag:types",
        "//tensorboard/webapp/feature_flag/actions",
        "//tensorboard/webapp/persistent_settings",
        "//tensorboard/webapp/webapp_data_source:feature_flag",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "feature_flag_metadata",
    srcs = [
        "feature_flag_metadata.ts",
    ],
    deps = [
        "//tensorboard/webapp/feature_flag:types",
        "//tensorboard/webapp/webapp_data_source:feature_flag_types",
        "@npm//@angular/core",
    ],
)

tf_ng_module(
    name = "types",
    srcs = [
        "feature_flag_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/feature_flag:types",
    ],
)

tf_ts_library(
    name = "testing",
    testonly = True,
    srcs = ["testing.ts"],
    deps = [
        ":types",
        "//tensorboard/webapp/feature_flag:testing",
    ],
)

tf_ng_module(
    name = "store_test_lib",
    testonly = True,
    srcs = [
        "feature_flag_metadata_test.ts",
        "feature_flag_reducers_test.ts",
        "feature_flag_selectors_test.ts",
    ],
    deps = [
        ":feature_flag_metadata",
        ":store",
        ":testing",
        ":types",
        "//tensorboard/webapp/feature_flag:testing",
        "//tensorboard/webapp/feature_flag:types",
        "//tensorboard/webapp/feature_flag/actions",
        "//tensorboard/webapp/persistent_settings",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
