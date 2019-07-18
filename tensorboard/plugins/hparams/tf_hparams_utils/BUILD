load("//tensorboard/defs:web.bzl", "tf_web_library", "tf_web_test")
load("//tensorboard/defs:defs.bzl", "tensorboard_webcomponent_library")

package(default_visibility =
            ["//tensorboard/plugins/hparams:__subpackages__"])

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "tf_hparams_utils",
    srcs = [
        "tf-hparams-utils.d.ts",
        "tf-hparams-utils.html",
    ],
    path = "/tf-hparams-utils",
    deps = [
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:lodash",
    ],
)

tf_web_test(
    name = "test",
    src = "/tf-hparams-utils/test/tf-hparams-utils-test.html",
    web_library = ":test_lib",
)

tf_web_library(
    name = "test_lib",
    testonly = 1,
    srcs = [
        "test/tf-hparams-utils-test.html",
    ],
    path = "/tf-hparams-utils",
    deps = [
        ":tf_hparams_utils",
        "//tensorboard/components/tf_imports:d3",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:web_component_tester",
    ],
)

tensorboard_webcomponent_library(
    name = "legacy",
    srcs = [":tf_hparams_utils"],
    destdir = "tf-hparams-utils",
    deps = [
        "//tensorboard/components/tf_imports_google:lib",
    ],
)
