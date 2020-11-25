load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

# TODO(stephanwlee): move this into shareable place and use it in Polymer-based
# modules when Angular is ready to be built as part of TensorBoard.
tf_ts_library(
    name = "types",
    srcs = [
        "api.ts",
        "data.ts",
    ],
)

tf_ts_library(
    name = "ui",
    srcs = ["ui.ts"],
)
