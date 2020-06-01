load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ts_library(
    name = "testing",
    testonly = True,
    srcs = ["index.ts"],
    deps = [
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store",
        "//tensorboard/plugins/debugger_v2/tf_debugger_v2_plugin/store:types",
        "@npm//@angular/core",
        "@npm//@ngrx/store",
    ],
)
