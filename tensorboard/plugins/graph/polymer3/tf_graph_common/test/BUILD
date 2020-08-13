load("//tensorboard/defs:web.bzl", "tf_web_library", "tf_web_test")

package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

licenses(["notice"])  # Apache 2.0

tf_web_test(
    name = "test",
    src = "/tf-graph-common/test/index.html",
    tags = ["manual"],
    web_library = ":test_web_library",
)

tf_web_library(
    name = "test_web_library",
    srcs = [
        "graph-test.ts",
        "hierarchy-test.ts",
        "index.html",
        "layout-test.ts",
        "parser-test.ts",
        "util.ts",
        "util-test.ts",
    ],
    path = "/tf-graph-common/test",
    deps = [
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:web_component_tester",
        "//tensorboard/plugins/graph/tf_graph_common",
    ],
)
