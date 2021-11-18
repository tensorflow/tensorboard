load("//tensorboard/defs:defs.bzl", "tf_sass_library")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

tf_sass_library(
    name = "theme",
    srcs = [
        "_tb_palette.scss",
        "_tb_theme.scss",
    ],
    deps = [
        "//tensorboard/webapp:angular_material_sass_deps",
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
