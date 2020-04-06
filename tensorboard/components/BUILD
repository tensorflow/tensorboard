package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "polymer_lib",
    srcs = [
        "polymer_lib.html",
    ],
    path = "/",
    deps = [
        ":analytics",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_tensorboard",
        "//tensorboard/components/tf_tensorboard:default_plugins",
    ],
)

# This Polymer only binary without entry point.
tensorboard_html_binary(
    name = "polymer_lib_binary",
    compile = True,
    input_path = "/polymer_lib.html",
    output_path = "/polymer_lib_binary.html",
    deps = [":polymer_lib"],
)

tf_web_library(
    name = "tensorboard",
    srcs = ["tensorboard.html"],
    path = "/",
    deps = [
        ":polymer_lib_binary",
    ],
)

tensorboard_html_binary(
    name = "index",
    compile = False,
    input_path = "/tensorboard.html",
    js_path = "/index.js",
    output_path = "/index.html",
    deps = [":tensorboard"],
)

genrule(
    name = "gen_tensorboard.html",
    srcs = ["tensorboard.uninlined.html"],
    outs = ["tensorboard.html"],
    cmd = "$(execpath //tensorboard/logo:inline_favicon) $< >$@",
    tools = ["//tensorboard/logo:inline_favicon"],
)

tf_web_library(
    name = "analytics",
    srcs = [
        "analytics.html",
    ],
    path = "/",
)

tf_web_library(
    name = "security",
    srcs = [
        "security.html",
    ],
    path = "/",
    visibility = ["//visibility:public"],
)
