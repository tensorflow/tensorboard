load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

package(default_visibility = ["//tensorboard:internal"])

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
    destdir = "tf-card-heading",
    deps = [
        "//tensorboard/components/tf_imports:polymer_lib",
        "//tensorboard/components/tf_markdown_view:legacy",
        "//third_party/javascript/polymer/v2/paper-dialog:lib",
        "//third_party/javascript/polymer/v2/paper-dialog-scrollable:lib",
        "//third_party/javascript/polymer/v2/paper-icon-button:lib",
    ],
)
