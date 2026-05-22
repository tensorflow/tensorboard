load("@io_bazel_rules_sass//:defs.bzl", "sass_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

sass_library(
    name = "style_lib",
    srcs = ["_lib.scss"],
    deps = ["//tensorboard/webapp/angular_components:material_sass"],
)
