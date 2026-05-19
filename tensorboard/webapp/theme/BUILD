load("@io_bazel_rules_sass//:defs.bzl", "sass_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

sass_library(
    name = "theme",
    srcs = [
        "_tb_palette.scss",
        "_tb_theme.scss",
    ],
    deps = [
        "//tensorboard/webapp/angular_components:material_sass",
    ],
)

genrule(
    name = "inline_palette",
    srcs = [
        "_variable.scss",
        "_tb_theme.template.scss",
    ],
    outs = ["_tb_theme.scss"],
    cmd = "cat $(SRCS) > $@",
)
