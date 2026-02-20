load("//tensorbored/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorbored:internal"])

licenses(["notice"])

tf_ng_module(
    name = "effects",
    srcs = [
        "index.ts",
        "runs_effects.ts",
    ],
    deps = [
        "//tensorbored/webapp:app_state",
        "//tensorbored/webapp:selectors",
        "//tensorbored/webapp/app_routing",
        "//tensorbored/webapp/app_routing:types",
        "//tensorbored/webapp/app_routing/actions",
        "//tensorbored/webapp/core/actions",
        "//tensorbored/webapp/feature_flag/actions",
        "//tensorbored/webapp/feature_flag/store",
        "//tensorbored/webapp/hparams/_redux:hparams_actions",
        "//tensorbored/webapp/runs:types",
        "//tensorbored/webapp/runs/actions",
        "//tensorbored/webapp/runs/data_source",
        "//tensorbored/webapp/runs/store:selectors",
        "//tensorbored/webapp/types",
        "//tensorbored/webapp/util:oklch_colors",
        "//tensorbored/webapp/widgets/data_table:types",
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
        "runs_effects_test.ts",
    ],
    deps = [
        ":effects",
        "//tensorbored/webapp:app_state",
        "//tensorbored/webapp:selectors",
        "//tensorbored/webapp/angular:expect_angular_core_testing",
        "//tensorbored/webapp/angular:expect_ngrx_store_testing",
        "//tensorbored/webapp/app_routing:testing",
        "//tensorbored/webapp/app_routing:types",
        "//tensorbored/webapp/core/actions",
        "//tensorbored/webapp/hparams/_redux:hparams_actions",
        "//tensorbored/webapp/runs/actions",
        "//tensorbored/webapp/runs/data_source",
        "//tensorbored/webapp/runs/data_source:testing",
        "//tensorbored/webapp/runs/store:selectors",
        "//tensorbored/webapp/testing:utils",
        "//tensorbored/webapp/types",
        "//tensorbored/webapp/widgets/data_table:types",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
        "@npm//@types/jasmine",
        "@npm//rxjs",
    ],
)
