package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])

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

py_binary(
    name = "inline_file_content",
    srcs = ["inline_file_content.py"],
)
