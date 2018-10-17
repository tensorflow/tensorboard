package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_card_heading",
    srcs = [
        "tf-card-heading.html",
        "tf-card-heading-style.html",
        "util.html",
        "util.ts",
    ],
    path = "/tf-card-heading",
    visibility = ["//visibility:public"],
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_markdown_view",
        "@org_polymer_paper_dialog",
        "@org_polymer_paper_dialog_scrollable",
        "@org_polymer_paper_icon_button",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_card_heading"],
    visibility = ["//visibility:public"],
    destdir = "tf-card-heading",
    deps = [
        "//tensorboard/components/tf_markdown_view:legacy",
        "//third_party/javascript/polymer/v1/paper-dialog:lib",
        "//third_party/javascript/polymer/v1/paper-dialog-scrollable:lib",
        "//third_party/javascript/polymer/v1/paper-icon-button:lib",
        "//third_party/javascript/polymer/v1/polymer:lib",
    ],
)
