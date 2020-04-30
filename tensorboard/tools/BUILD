package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

py_binary(
    name = "import_google_fonts",
    srcs = ["import_google_fonts.py"],
    deps = ["//tensorboard:expect_tensorflow_installed"],
)

sh_binary(
    name = "mat_bundle_icon_svg",
    srcs = ["mat_bundle_icon_svg.sh"],
    visibility = [
        "//tensorboard:internal",
    ],
)
