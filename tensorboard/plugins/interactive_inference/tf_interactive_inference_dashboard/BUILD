package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "wit_assets",
    srcs = [
        "distance.png",
        "editedexample.png",
        "explorecounterfactuals.png",
        "pdplots.png",
    ],
    path = "/tf-interactive-inference-dashboard",
)

tf_web_library(
    name = "tf_interactive_inference_dashboard",
    srcs = [
        "tf-interactive-inference-dashboard.html",
    ],
    path = "/tf-interactive-inference-dashboard",
    deps = [
        ":wit_assets",
        ":tf_confusion_matrix",
        ":tf_inference_panel",
        ":tf_inference_viewer",
        ":tf_regression_table",
        "//tensorboard/components/vz_example_viewer",
        "//tensorboard/components/vz_bar_chart",
        "//tensorboard/components/vz_line_chart",
        "@ai_google_pair_facets//facets_dive/components/facets_dive",
        "@ai_google_pair_facets//facets_overview/components/facets_overview",
        "@org_polymer_iron_collapse",
        "@org_polymer_iron_icons",
        "@org_polymer_iron_pages",
        "@org_polymer_paper_button",
        "@org_polymer_paper_dialog",
        "@org_polymer_paper_dropdown_menu",
        "@org_polymer_paper_icon_button",
        "@org_polymer_paper_input",
        "@org_polymer_paper_item",
        "@org_polymer_paper_listbox",
        "@org_polymer_paper_radio_button",
        "@org_polymer_paper_radio_group",
        "@org_polymer_paper_slider",
        "@org_polymer_paper_spinner",
        "@org_polymer_paper_styles",
        "@org_polymer_paper_tabs",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_storage",
        "//tensorboard/components/tf_tensorboard:registry",
    ],
)

tf_web_library(
    name = "tf_inference_viewer",
    srcs = [
        "tf-inference-viewer.html",
    ],
    path = "/tf-interactive-inference-dashboard",
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "@org_polymer_iron_icons",
    ],
)

tf_web_library(
    name = "tf_confusion_matrix",
    srcs = [
        "tf-confusion-matrix.html",
    ],
    path = "/tf-interactive-inference-dashboard",
    deps = [
        "//tensorboard/components/tf_imports:polymer",
    ],
)

tf_web_library(
    name = "tf_inference_panel",
    srcs = [
        "tf-inference-panel.html",
    ],
    path = "/tf-interactive-inference-dashboard",
    deps = [
        "//tensorboard/components/tf_storage",
        "@org_polymer_paper_button",
        "@org_polymer_paper_input",
        "@org_polymer_paper_radio_button",
        "@org_polymer_paper_radio_group",
    ],
)

tf_web_library(
    name = "tf_regression_table",
    srcs = [
        "tf-regression-table.html",
    ],
    path = "/tf-interactive-inference-dashboard",
    deps = [
        "//tensorboard/components/tf_imports:polymer",
    ],
)
