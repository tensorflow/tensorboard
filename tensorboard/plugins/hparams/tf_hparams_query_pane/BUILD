load("//tensorboard/defs:web.bzl", "tf_web_library", "tf_web_test")
load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "schema_d_ts",
    srcs = [
        "schema.d.ts",
    ],
    path = "/tf-hparams-query-pane",
)

tf_web_library(
    name = "tf_hparams_query_pane",
    srcs = [
        "tf-hparams-query-pane.html",
    ],
    path = "/tf-hparams-query-pane",
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:vaadin_split_layout",
        "//tensorboard/plugins/hparams/tf_hparams_utils",
        "@org_polymer_paper_checkbox",
        "@org_polymer_paper_dropdown_menu",
        "@org_polymer_paper_input",
        "@org_polymer_paper_item",
        "@org_polymer_paper_listbox",
    ],
)

tf_web_test(
    name = "test",
    src = "/tf-hparams-query-pane/test/tf-hparams-query-pane-test.html",
    web_library = ":test_lib",
)

tf_web_library(
    name = "test_lib",
    testonly = 1,
    srcs = [
        "test/tf-hparams-query-pane-test.html",
    ],
    path = "/tf-hparams-query-pane",
    deps = [
        ":tf_hparams_query_pane",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:web_component_tester",
        "//tensorboard/plugins/hparams/tf_hparams_backend",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_hparams_query_pane"],
    destdir = "tf-hparams-query-pane",
    deps = [
        "//tensorboard/components/tf_backend:legacy",
        "//tensorboard/components/tf_imports:polymer_lib",
        "//tensorboard/components/tf_imports_google:lib",
        "//tensorboard/plugins/hparams/tf_hparams_utils:legacy",
        "//third_party/javascript/polymer/v2/paper-checkbox:lib",
        "//third_party/javascript/polymer/v2/paper-dropdown-menu:lib",
        "//third_party/javascript/polymer/v2/paper-input:lib",
        "//third_party/javascript/polymer/v2/paper-item:lib",
        "//third_party/javascript/polymer/v2/paper-listbox:lib",
    ],
)
