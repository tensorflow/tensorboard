package(default_visibility = ["//visibility:public"])

load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "vz_example_viewer",
    srcs = [
        "vz-example-viewer.html",
        "vz-example-viewer.ts",
    ],
    path = "/vz-example-viewer",
    deps = [
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:polymer",
        "@org_polymer_iron_icons",
        "@org_polymer_paper_button",
        "@org_polymer_paper_card",
        "@org_polymer_paper_checkbox",
        "@org_polymer_paper_dialog",
        "@org_polymer_paper_icon_button",
        "@org_polymer_paper_input",
        "@org_polymer_paper_radio_button",
        "@org_polymer_paper_radio_group",
        "@org_polymer_paper_slider",
        "@org_tensorflow//tensorflow/core:example_protos_closure",
    ],
)

tf_web_library(
    name = "demo",
    srcs = ["index.html"],
    path = "/vz-example-viewer",
    deps = [
        ":vz_example_viewer",
        "@org_polymer_iron_demo_helpers",
        "@org_polymer_paper_styles",
    ],
)

tensorboard_html_binary(
    name = "demoserver",
    testonly = True,  # Keeps JavaScript somewhat readable
    compile = True,  # Run Closure Compiler
    input_path = "/vz-example-viewer/index.html",
    output_path = "/vz-example-viewer/demo.html",
    deps = [":demo"],
)

