package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_interactive_inference_dashboard",
    srcs = [
        "tf-interactive-inference-dashboard.html",
    ],
    path = "/tf-interactive-inference-dashboard",
    deps = [
        ":tf_inference_viewer",
        "//tensorboard/components/vz_example_viewer",
        "//tensorboard/components/vz_line_chart",
        "//tensorboard/plugins/inference/tf_inference_panel",
        "@ai_google_pair_facets//facets_dive/components/facets_dive",
        "@org_polymer_iron_collapse",
        "@org_polymer_iron_icon",
        "@org_polymer_iron_pages",
        "@org_polymer_paper_button",
        "@org_polymer_paper_dialog",
        "@org_polymer_paper_dropdown_menu",
        "@org_polymer_paper_icon_button",
        "@org_polymer_paper_input",
        "@org_polymer_paper_item",
        "@org_polymer_paper_listbox",
        "@org_polymer_paper_slider",
        "@org_polymer_paper_spinner",
        "@org_polymer_paper_styles",
        "@org_polymer_paper_tabs",
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_imports:closure",
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
    name = "demo",
    testonly = True,
    srcs = ["index.html"],
    path = "/tf-interactive-inference-dashboard",
    deps = [
        ":tf_interactive_inference_dashboard",
        "//tensorboard/components/tf_imports:webcomponentsjs",
        "@org_polymer_iron_demo_helpers",
        "@org_polymer_paper_styles",
    ],
)

tensorboard_html_binary(
    name = "demoserver",
    testonly = True,  # Keeps JavaScript somewhat readable
    compile = True,  # Run Closure Compiler
    input_path = "/tf-interactive-inference-dashboard/index.html",
    output_path = "/tf-interactive-inference-dashboard/demo.html",
    deps = [":demo"],
)