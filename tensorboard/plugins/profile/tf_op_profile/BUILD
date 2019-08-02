package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_op_profile",
    srcs = ["tf-op-profile.html"],
    path = "/tf-op-profile",
    visibility = ["//visibility:public"],
    deps = [
        ":tf_op_details",
        ":tf_op_table",
        ":utils",
        "@org_polymer_paper_slider",
        "@org_polymer_paper_toggle_button",
    ],
)

tf_web_library(
    name = "tf_op_details",
    srcs = ["tf-op-details.html"],
    path = "/tf-op-profile",
    deps = [
        ":utils",
        "@org_polymer_paper_card",
    ],
)

tf_web_library(
    name = "tf_op_table",
    srcs = ["tf-op-table.html"],
    path = "/tf-op-profile",
    deps = [
        ":utils",
    ],
)

tf_web_library(
    name = "utils",
    srcs = [
        "utils.html",
        "utils.ts",
    ],
    path = "/tf-op-profile",
)
