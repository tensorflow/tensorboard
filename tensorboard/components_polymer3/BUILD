load("//tensorboard/defs:defs.bzl", "tf_js_binary", "tf_ts_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")

package(default_visibility = ["//tensorboard:internal"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "polymer_lib",
    srcs = [
        "polymer_lib.html",
    ],
    path = "/",
    deps = [
        ":analytics_html",
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

tf_ts_library(
    name = "polymer3_ts_lib",
    srcs = ["polymer3_lib.ts"],
    deps = [
        "//tensorboard/components_polymer3/tf_backend",
        "//tensorboard/components_polymer3/tf_globals",
        "//tensorboard/components_polymer3/tf_markdown_view",
        "//tensorboard/components_polymer3/tf_storage",
        "//tensorboard/components_polymer3/tf_paginated_view",
        "//tensorboard/plugins/text/polymer3/tf_text_dashboard",
    ],
)

tf_js_binary(
    name = "polymer3_lib_binary",
    compile = True,
    entry_point = ":polymer3_lib.ts",
    deps = [":polymer3_ts_lib"],
)

tensorboard_html_binary(
    name = "legacy",
    compile = False,
    input_path = "/tensorboard.html",
    js_path = "/legacy.js",
    output_path = "/legacy.html",
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
    name = "analytics_html",
    srcs = [
        "analytics.html",
    ],
    path = "/",
)

tf_ts_library(
    name = "analytics",
    srcs = [
        "analytics.ts",
    ],
)

tf_ts_library(
    name = "security",
    srcs = [
        "security.ts",
    ],
    strict_checks = False,
    deps = [
        "@npm//@polymer/polymer",
    ],
)
