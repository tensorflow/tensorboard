package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

load("//tensorboard/defs:web.bzl", "tf_web_library", "tf_web_test")

licenses(["notice"])  # Apache 2.0

tf_web_test(
    name = "test",
    web_library = ":test_web_library",
    src = "/tf-graph-common/test/index.html",
)

tf_web_library(
    name = "test_web_library",
    srcs = [
        "index.html",
        "graph-test.ts",
        "hierarchy-test.ts",
        "layout-test.ts",
        "parser-test.ts",
        "util-test.ts",
        "util.ts",
    ],
    path = "/tf-graph-common/test",
    deps = [
        "//tensorboard/components/tf_imports:webcomponentsjs",
        "//tensorboard/components/tf_imports:web_component_tester",
        "//tensorboard/plugins/graph/tf_graph_common",
    ],
)
