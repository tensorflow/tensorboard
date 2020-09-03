load("//tensorboard/defs:defs.bzl", "tf_ts_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_ts_library(
    name = "tf_color_scale",
    srcs = [
        "colorScale.ts",
        "palettes.ts",
    ],
    strict_checks = False,
    deps = [
        "//tensorboard/components/tf_backend",
        "@npm//@types/d3",
        "@npm//d3",
    ],
)
