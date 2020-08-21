load("//tensorboard/defs:web.bzl", "tf_web_library")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")

package(
    default_testonly = True,
    default_visibility = ["//tensorboard:internal"],
)

licenses(["notice"])  # Apache 2.0

tf_web_library(
    name = "microbenchmark",
    srcs = [
        "async.ts",
        "main.html",
        "main.ts",
        "polymer_util.ts",
        "renders_spec.ts",
        "reporter.ts",
        "runner.ts",
        "spec.ts",
        "types.ts",
    ],
    path = "/vz-line-chart2/benchmark",
    deps = [
        "//tensorboard/components/tf_imports:plottable",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/vz_line_chart2",
    ],
)

tensorboard_html_binary(
    name = "binary",
    compile = True,
    input_path = "/vz-line-chart2/benchmark/main.html",
    output_path = "/benchmark.html",
    deps = [":microbenchmark"],
)
