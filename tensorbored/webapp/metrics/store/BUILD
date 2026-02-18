load("//tensorbored/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorbored:internal"])

tf_ts_library(
    name = "store",
    srcs = [
        "index.ts",
        "metrics_reducers.ts",
        "metrics_selectors.ts",
    ],
    deps = [
        ":internal_utils",
        ":types",
        "//tensorbored/webapp:app_state",
        "//tensorbored/webapp/app_routing",
        "//tensorbored/webapp/app_routing:namespaced_state_reducer_helper",
        "//tensorbored/webapp/app_routing:types",
        "//tensorbored/webapp/app_routing/actions",
        "//tensorbored/webapp/core/actions",
        "//tensorbored/webapp/hparams/_redux:hparams_selectors",
        "//tensorbored/webapp/metrics:types",
        "//tensorbored/webapp/metrics:utils",
        "//tensorbored/webapp/metrics/actions",
        "//tensorbored/webapp/metrics/data_source",
        "//tensorbored/webapp/metrics/views/card_renderer:scalar_card_types",
        "//tensorbored/webapp/metrics/views/card_renderer:utils",
        "//tensorbored/webapp/persistent_settings",
        "//tensorbored/webapp/types",
        "//tensorbored/webapp/util:dom",
        "//tensorbored/webapp/util:lang",
        "//tensorbored/webapp/util:memoize",
        "//tensorbored/webapp/util:ngrx",
        "//tensorbored/webapp/util:types",
        "//tensorbored/webapp/widgets/card_fob:types",
        "//tensorbored/webapp/widgets/data_table:types",
        "//tensorbored/webapp/widgets/data_table:utils",
        "//tensorbored/webapp/widgets/line_chart_v2/lib:internal_types",
        "//tensorbored/webapp/widgets/line_chart_v2/lib:public_types",
        "@npm//@ngrx/store",
    ],
)

tf_ng_module(
    name = "metrics_initial_state_provider",
    srcs = [
        "metrics_initial_state_provider.ts",
    ],
    deps = [
        ":store",
        ":types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
    ],
)

tf_ts_library(
    name = "internal_utils",
    srcs = [
        "metrics_store_internal_utils.ts",
    ],
    visibility = ["//tensorbored/webapp/metrics/store:__subpackages__"],
    deps = [
        ":types",
        "//tensorbored/webapp/metrics:types",
        "//tensorbored/webapp/metrics/data_source",
        "//tensorbored/webapp/types",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "metrics_types.ts",
    ],
    deps = [
        "//tensorbored/webapp/app_routing:namespaced_state_reducer_helper",
        "//tensorbored/webapp/metrics:types",
        "//tensorbored/webapp/metrics/data_source",
        "//tensorbored/webapp/types",
        "//tensorbored/webapp/util:dom",
        "//tensorbored/webapp/widgets/data_table:types",
        "//tensorbored/webapp/widgets/line_chart_v2/lib:internal_types",
        "//tensorbored/webapp/widgets/line_chart_v2/lib:public_types",
    ],
)

tf_ts_library(
    name = "store_test",
    testonly = True,
    srcs = [
        "metrics_reducers_test.ts",
        "metrics_selectors_test.ts",
        "metrics_store_internal_utils_test.ts",
    ],
    deps = [
        ":internal_utils",
        ":store",
        ":types",
        "//tensorbored/webapp/app_routing:testing",
        "//tensorbored/webapp/app_routing:types",
        "//tensorbored/webapp/app_routing/actions",
        "//tensorbored/webapp/core/actions",
        "//tensorbored/webapp/hparams:testing",
        "//tensorbored/webapp/hparams/_redux:types",
        "//tensorbored/webapp/metrics:test_lib",
        "//tensorbored/webapp/metrics:types",
        "//tensorbored/webapp/metrics/actions",
        "//tensorbored/webapp/metrics/data_source",
        "//tensorbored/webapp/persistent_settings",
        "//tensorbored/webapp/routes:testing",
        "//tensorbored/webapp/testing:utils",
        "//tensorbored/webapp/types",
        "//tensorbored/webapp/util:dom",
        "//tensorbored/webapp/util:types",
        "//tensorbored/webapp/widgets/card_fob:types",
        "//tensorbored/webapp/widgets/data_table:types",
        "//tensorbored/webapp/widgets/line_chart_v2/lib:internal_types",
        "@npm//@types/jasmine",
    ],
)
