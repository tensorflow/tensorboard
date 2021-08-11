load("//tensorboard/defs:defs.bzl", "tf_ng_module", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "core",
    srcs = [
        "core_module.ts",
        "index.ts",
    ],
    deps = [
        ":state",
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/effects",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/core/views:layout",
        "//tensorboard/webapp/deeplink",
        "//tensorboard/webapp/persistent_settings",
        "//tensorboard/webapp/webapp_data_source",
        "@npm//@angular/core",
        "@npm//@ngrx/effects",
        "@npm//@ngrx/store",
    ],
)

tf_ng_module(
    name = "types",
    srcs = [
        "types.ts",
    ],
    deps = [
        "@npm//@angular/core",
    ],
)

tf_ts_library(
    name = "state",
    srcs = [
        "state.ts",
    ],
    deps = [
        "//tensorboard/webapp:app_state",
    ],
)
