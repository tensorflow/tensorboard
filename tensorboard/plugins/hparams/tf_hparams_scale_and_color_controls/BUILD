load("//tensorboard/defs:web.bzl", "tf_web_library", "tf_web_test")
load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_hparams_scale_and_color_controls",
    srcs = [
        "tf-hparams-scale-and-color-controls.html",
    ],
    path = "/tf-hparams-scale-and-color-controls",
    deps = [
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/plugins/hparams/tf_hparams_utils",
        "@org_polymer_paper_dropdown_menu",
        "@org_polymer_paper_item",
        "@org_polymer_paper_listbox",
        "@org_polymer_paper_radio_button",
        "@org_polymer_paper_radio_group",
    ],
)

tf_web_test(
    name = "test",
    src = "/tf-hparams-scale-and-color-controls/test/tf-hparams-scale-and-color-controls-test.html",
    web_library = ":test_lib",
)

tf_web_library(
    name = "test_lib",
    testonly = 1,
    srcs = [
        "test/tf-hparams-scale-and-color-controls-test.html",
    ],
    path = "/tf-hparams-scale-and-color-controls",
    deps = [
        ":tf_hparams_scale_and_color_controls",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:web_component_tester",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_hparams_scale_and_color_controls"],
    destdir = "tf-hparams-scale-and-color-controls",
    deps = [
        "//tensorboard/components/tf_imports:polymer_lib",
        "//tensorboard/components/tf_imports_google:lib",
        "//tensorboard/plugins/hparams/tf_hparams_utils:legacy",
        "//third_party/javascript/polymer/v2/paper-dropdown-menu:lib",
        "//third_party/javascript/polymer/v2/paper-item:lib",
        "//third_party/javascript/polymer/v2/paper-listbox:lib",
        "//third_party/javascript/polymer/v2/paper-radio-button:lib",
        "//third_party/javascript/polymer/v2/paper-radio-group:lib",
    ],
)
