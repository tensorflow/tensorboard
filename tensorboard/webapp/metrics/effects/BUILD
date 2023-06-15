load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "effects",
    srcs = [
        "card_interaction_effects.ts",
        "index.ts",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/app_routing/actions",
        "//tensorboard/webapp/app_routing/store",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/data_source:card_interactions_data_source",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/types",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "effects_test",
    testonly = True,
    srcs = [
        "card_interactions_effects_test.ts",
        "metrics_effects_test.ts",
    ],
    deps = [
        ":effects",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:selectors",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/app_routing:testing",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/app_routing/actions",
        "//tensorboard/webapp/app_routing/store",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/metrics:internal_types",
        "//tensorboard/webapp/metrics:test_lib",
        "//tensorboard/webapp/metrics:types",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/metrics/data_source:card_interactions_data_source",
        "//tensorboard/webapp/metrics/store",
        "//tensorboard/webapp/testing:utils",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/util:dom",
        "//tensorboard/webapp/webapp_data_source:http_client_testing",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
