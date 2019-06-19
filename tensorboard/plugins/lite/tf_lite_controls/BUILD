package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")
load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_lite_controls",
    srcs = ["tf-lite-controls.html"],
    path = "/tf-lite-controls",
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/lite/tf_lite_common",
        "@org_polymer_iron_pages",
        "@org_polymer_paper_button",
        "@org_polymer_paper_icon_button",
        "@org_polymer_paper_dialog",
        "@org_polymer_paper_toast",
        "@org_polymer_paper_item",
        "@org_polymer_paper_listbox",
        "@org_polymer_paper_radio_group",
        "@org_polymer_paper_tooltip",
        "@org_polymer_paper_tabs"
    ],
)
