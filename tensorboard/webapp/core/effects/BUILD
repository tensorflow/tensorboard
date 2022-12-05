load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "effects",
    srcs = [
        "core_effects.ts",
        "index.ts",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp:tb_polymer_interop_types",
        "//tensorboard/webapp/app_routing",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/app_routing/actions",
        "//tensorboard/webapp/app_routing/store",
        "//tensorboard/webapp/app_routing/store:types",
        "//tensorboard/webapp/core:state",
        "//tensorboard/webapp/core:types",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/feature_flag/store",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/webapp_data_source",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "core_effects_test_lib",
    testonly = True,
    srcs = [
        "core_effects_test.ts",
    ],
    deps = [
        ":effects",
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/angular:expect_angular_core_testing",
        "//tensorboard/webapp/angular:expect_ngrx_store_testing",
        "//tensorboard/webapp/app_routing:testing",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/app_routing/actions",
        "//tensorboard/webapp/app_routing/store",
        "//tensorboard/webapp/core:types",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/feature_flag/store",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/webapp_data_source",
        "//tensorboard/webapp/webapp_data_source:http_client_testing",
        "@npm//@angular/common",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
