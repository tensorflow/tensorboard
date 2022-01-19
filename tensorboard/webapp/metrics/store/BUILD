load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

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
        "//tensorboard/webapp:app_state",
        "//tensorboard/webapp/app_routing",
        "//tensorboard/webapp/app_routing:namespaced_state_reducer_helper",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/app_routing/actions",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/metrics:internal_types",
        "//tensorboard/webapp/metrics:utils",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/persistent_settings",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/util:dom",
        "//tensorboard/webapp/util:lang",
        "//tensorboard/webapp/util:ngrx",
        "//tensorboard/webapp/util:types",
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
    visibility = ["//tensorboard/webapp/metrics/store:__subpackages__"],
    deps = [
        ":types",
        "//tensorboard/webapp/metrics:internal_types",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/types",
    ],
)

tf_ts_library(
    name = "types",
    srcs = [
        "metrics_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/app_routing:namespaced_state_reducer_helper",
        "//tensorboard/webapp/metrics:internal_types",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/util:dom",
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
        "//tensorboard/webapp/app_routing:testing",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/app_routing/actions",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/metrics:internal_types",
        "//tensorboard/webapp/metrics:test_lib",
        "//tensorboard/webapp/metrics/actions",
        "//tensorboard/webapp/metrics/data_source",
        "//tensorboard/webapp/persistent_settings",
        "//tensorboard/webapp/routes:testing",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/util:dom",
        "@npm//@types/jasmine",
    ],
)
