load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "store",
    srcs = [
        "core_initial_state_provider.ts",
        "core_reducers.ts",
        "core_selectors.ts",
        "index.ts",
    ],
    deps = [
        ":types",
        "//tensorboard/webapp/core:types",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/deeplink",
        "//tensorboard/webapp/types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
        "@npm//rxjs",
    ],
)

tf_ng_module(
    name = "types",
    srcs = [
        "core_types.ts",
    ],
    deps = [
        "//tensorboard/webapp/core:types",
        "//tensorboard/webapp/types",
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
        ":types",
        "//tensorboard/webapp/core:types",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/testing",
        "//tensorboard/webapp/deeplink",
        "//tensorboard/webapp/types",
        "@npm//@types/jasmine",
    ],
)
