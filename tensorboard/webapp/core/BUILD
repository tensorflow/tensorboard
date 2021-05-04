load("//tensorboard/defs:defs.bzl", "tf_ng_module")

package(default_visibility = ["//tensorboard:internal"])

tf_ng_module(
    name = "core",
    srcs = [
        "core_module.ts",
    ],
    deps = [
        "//tensorboard/webapp/core/actions",
        "//tensorboard/webapp/core/effects",
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/deeplink",
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
)
