# Description:
#  Tools for building the TensorBoard pip package.

package(default_visibility = ["//visibility:private"])

licenses(["notice"])  # Apache 2.0

# rm -rf /tmp/tensorboard
# bazel run //tensorboard/pip_package:build_pip_package
# pip install -U /tmp/tensorboard/*py2*.pip
sh_binary(
    name = "build_pip_package",
    srcs = ["build_pip_package.sh"],
    data = [
        "LICENSE",
        "MANIFEST.in",
        "README.rst",
        "setup.cfg",
        "setup.py",
        "//tensorboard",  # Main tensorboard binary and everything it uses
        "//tensorboard:lib",  # User-facing overall TensorBoard API
        "//tensorboard:version",  # Version module (read by setup.py)
        "//tensorboard/plugins/beholder",  # User-facing beholder API
        "//tensorboard/plugins/projector",  # User-facing projector API
    ],
    tags = [
        "local",
        "manual",
    ],
)

genrule(
    name = "license",
    srcs = [
        "LICENSE.tensorflow",
        "@org_polymer//:LICENSE.txt",
        "@com_palantir_plottable//:package/LICENSE",
        "@org_d3js//:LICENSE",
        "@org_chromium_catapult_vulcanized_trace_viewer//:LICENSE",
        "@io_github_cpettitt_dagre//:LICENSE",
        "@io_github_cpettitt_graphlib//:LICENSE",
        "@io_github_waylonflinn_weblas//:LICENSE",
        "@com_numericjs//:license.txt",
        "@org_threejs//:LICENSE",
        "@com_lodash//:LICENSE",
        "@com_google_fonts_roboto//:LICENSE",
        "@org_mozilla_bleach//:LICENSE",
        "@org_html5lib//:LICENSE",
    ],
    outs = ["LICENSE"],
    cmd = "\n".join([
        "(",
        "  echo '#' TensorBoard License",
        "  echo",
        "  echo TensorBoard is licensed Apache 2.0 and distributed with",
        "  echo vendored content licensed Apache 2.0, MIT, and BSD-3.",
        "  echo",
        "  echo '##' Table of Contents",
        "  echo",
        "  for src in $(SRCS); do",
        "    echo '-' $$src",
        "  done",
        "  echo",
        "  echo '##' Licenses",
        "  for src in $(SRCS); do",
        "    echo",
        "    echo",
        "    echo",
        "    echo '###' $$src",
        "    echo",
        "    cat $$src",
        "  done",
        "",
        ") >$@",
    ]),
)
