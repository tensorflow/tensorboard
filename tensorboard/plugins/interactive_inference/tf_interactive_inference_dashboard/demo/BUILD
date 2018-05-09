package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "demo",
    testonly = True,
    srcs = [
        "index.html",
        "tf-interactive-inference-demo.html",
        "@org_tensorflow_tfjs//:tf.min.js",
    ] + glob(["data/**"]),
    path = "/tf-interactive-inference-dashboard",
    deps = [
        "//tensorboard/plugins/interactive_inference/tf_interactive_inference_dashboard",
        "//tensorboard/components/tf_imports:closure",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:webcomponentsjs",
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