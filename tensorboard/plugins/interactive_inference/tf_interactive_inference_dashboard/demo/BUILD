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

tf_web_library(
    name = "imagedemo",
    testonly = True,
    srcs = [
        "image_index.html",
        "tf-interactive-inference-image-demo.html",
        "@org_tensorflow_tfjs//:tf.min.js",
    ] + glob(["data/**"]),
    path = "/tf-interactive-inference-dashboard",
    deps = [
        "//tensorboard/plugins/interactive_inference/tf_interactive_inference_dashboard",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:webcomponentsjs",
    ],
)

tensorboard_html_binary(
    name = "imagedemoserver",
    testonly = True,  # Keeps JavaScript somewhat readable
    compile = True,  # Run Closure Compiler
    input_path = "/tf-interactive-inference-dashboard/image_index.html",
    output_path = "/tf-interactive-inference-dashboard/image_demo.html",
    deps = [":imagedemo"],
)

tf_web_library(
    name = "irisdemo",
    testonly = True,
    srcs = [
        "iris_index.html",
        "tf-interactive-inference-iris-demo.html",
        "@org_tensorflow_tfjs//:tf.min.js",
    ] + glob(["data/**"]),
    path = "/tf-interactive-inference-dashboard",
    deps = [
        "//tensorboard/plugins/interactive_inference/tf_interactive_inference_dashboard",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:webcomponentsjs",
    ],
)

tensorboard_html_binary(
    name = "irisdemoserver",
    testonly = True,  # Keeps JavaScript somewhat readable
    compile = True,  # Run Closure Compiler
    input_path = "/tf-interactive-inference-dashboard/iris_index.html",
    output_path = "/tf-interactive-inference-dashboard/iris_demo.html",
    deps = [":irisdemo"],
)


tf_web_library(
    name = "agedemo",
    testonly = True,
    srcs = [
        "age_index.html",
        "tf-interactive-inference-age-demo.html",
        "@org_tensorflow_tfjs//:tf.min.js",
    ] + glob(["data/**"]),
    path = "/tf-interactive-inference-dashboard",
    deps = [
        "//tensorboard/plugins/interactive_inference/tf_interactive_inference_dashboard",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:webcomponentsjs",
    ],
)

tensorboard_html_binary(
    name = "agedemoserver",
    testonly = True,  # Keeps JavaScript somewhat readable
    compile = True,  # Run Closure Compiler
    input_path = "/tf-interactive-inference-dashboard/age_index.html",
    output_path = "/tf-interactive-inference-dashboard/age_demo.html",
    deps = [":agedemo"],
)
