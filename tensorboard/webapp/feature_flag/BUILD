load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ng_web_test_suite", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "feature_flag",
    srcs = [
        "feature_flag_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/angular:expect_angular_common_http",
        "//tensorboard/webapp/feature_flag/effects",
        "//tensorboard/webapp/feature_flag/http",
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
    srcs = [
        "testing.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/feature_flag/store:feature_flag_metadata",
    ],
)

tf_ng_web_test_suite(
    name = "karma_test",
    deps = [
        "//tensorboard/webapp/feature_flag/directives:directives_test_lib",
        "//tensorboard/webapp/feature_flag/effects:effects_test_lib",
        "//tensorboard/webapp/feature_flag/http:http_test_lib",
        "//tensorboard/webapp/feature_flag/store:store_test_lib",
        "//tensorboard/webapp/feature_flag/views:views_test_lib",
    ],
)
