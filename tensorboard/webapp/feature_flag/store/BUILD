load("//tensorboard/defs:defs.bzl", "tf_ng_module")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "store",
    srcs = [
        "feature_flag_reducers.ts",
        "feature_flag_selectors.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/feature_flag:types",
        "//tensorboard/webapp/feature_flag/actions",
        "//tensorboard/webapp/webapp_data_source:feature_flag",
        "@npm//@ngrx/store",
        "@npm//rxjs",
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

tf_ng_module(
    name = "store_test_lib",
    testonly = True,
    srcs = [
        "feature_flag_reducers_test.ts",
        "feature_flag_selectors_test.ts",
        "testing.ts",
    ],
    deps = [
        ":store",
        ":types",
        "//tensorboard/webapp/feature_flag:types",
        "//tensorboard/webapp/feature_flag/actions",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
    ],
)
