load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "effects",
    srcs = [
        "index.ts",
        "text_effects.ts",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/plugins/text_v2:types",
        "//tensorboard/webapp/plugins/text_v2/actions",
        "//tensorboard/webapp/plugins/text_v2/data_source",
        "//tensorboard/webapp/plugins/text_v2/store",
        "//tensorboard/webapp/plugins/text_v2/store:types",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "effects_test_lib",
    testonly = True,
    srcs = [
        "text_effects_test.ts",
    ],
    deps = [
        ":effects",
        "//tensorboard/components/tf_categorization_utils",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/plugins/text_v2/actions",
        "//tensorboard/webapp/plugins/text_v2/data_source",
        "//tensorboard/webapp/plugins/text_v2/store",
        "//tensorboard/webapp/testing:utils",
        "//tensorboard/webapp/webapp_data_source:http_client_testing",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
