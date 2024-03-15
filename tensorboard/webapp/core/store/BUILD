load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "store",
    srcs = [
        "core_initial_state_provider.ts",
        "core_reducers.ts",
        "core_selectors.ts",
        "core_types.ts",
        "index.ts",
    ],
    deps = [
        "//tensorboard/webapp/app_routing:namespaced_state_reducer_helper",
        "//tensorboard/webapp/app_routing/actions",
        "//tensorboard/webapp/core:types",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/deeplink",
        "//tensorboard/webapp/persistent_settings",
        "//tensorboard/webapp/types",
        "//tensorboard/webapp/util:ngrx",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ts_library(
    name = "core_store_test_lib",
    testonly = True,
    srcs = [
        "core_initial_state_provider_test.ts",
        "core_reducers_test.ts",
        "core_selectors_test.ts",
    ],
    deps = [
        ":store",
        "//tensorboard/webapp/app_routing:types",
        "//tensorboard/webapp/app_routing/actions",
        "//tensorboard/webapp/core:types",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/deeplink",
        "//tensorboard/webapp/persistent_settings",
        "//tensorboard/webapp/types",
        "@npm//@types/jasmine",
    ],
)
