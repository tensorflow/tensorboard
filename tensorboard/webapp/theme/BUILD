load("//tensorboard/defs:defs.bzl", "tf_sass_library")

package(default_visibility = ["//tensorboard:internal"])

tf_sass_library(
    name = "theme",
    srcs = [
        "_tb_palette.scss",
        "_tb_theme.scss",
    ],
    deps = [
        "//tensorboard/webapp:angular_material_theming",
    ],
)
