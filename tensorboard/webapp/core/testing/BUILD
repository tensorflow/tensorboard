load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

tf_ts_library(
    name = "testing",
    testonly = True,
    srcs = ["index.ts"],
    deps = [
        "//tensorboard/webapp/core/store",
        "//tensorboard/webapp/types",
    ],
)
