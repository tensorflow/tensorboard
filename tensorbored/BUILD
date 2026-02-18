# Description:
# TensorBoard, a dashboard for investigating TensorFlow

load("@rules_python//python:py_binary.bzl", "py_binary")
load("@rules_python//python:py_library.bzl", "py_library")
load("@rules_python//python:py_test.bzl", "py_test")
load("//tensorbored/defs:py_repl.bzl", "py_repl")
load("//tensorbored/defs:web.bzl", "tf_web_library")
load("//tensorbored/defs:zipper.bzl", "tensorboard_zip_file")

package(default_visibility = [":internal"])

licenses(["notice"])

exports_files(["LICENSE"])  # Needed for internal repo.

package_group(
    name = "internal",
    packages = ["//tensorbored/..."],
)

# The standard TensorBored binary that serves the webapp.
py_binary(
    name = "tensorbored",
    srcs = ["main.py"],
    main = "main.py",
    srcs_version = "PY3",
    deps = [
        ":assets_lib",  # link dep for webfiles assets
        ":default",
        ":dynamic_plugins",  # loads internal dynamic plugin like projector
        ":lib",
        ":main_lib",
        ":program",
        "//tensorbored:expect_tensorflow_installed",
        "//tensorbored/plugins:base_plugin",
        "//tensorbored/util:tb_logging",
        "//tensorbored/util:timing",  # non-strict dep, for patching convenience
    ],
)

py_library(
    name = "main_lib",
    srcs = ["main_lib.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorbored:expect_absl_logging_installed",
        "//tensorbored/compat:tensorflow",
    ],
)

py_binary(
    name = "dev",
    srcs = ["main_dev.py"],
    data = ["dev_webfiles.zip"],
    main = "main_dev.py",
    srcs_version = "PY3",
    deps = [
        ":default",
        ":dynamic_plugins",  # loads internal dynamic plugin like projector
        ":lib",
        ":main_lib",
        ":program",
    ],
)

# Repl that depends on the full TensorBoard `library`, useful for ad-hoc exploration
# of the Python API surface. (Mere `python -i` generally doesn't suffice due to deps
# on generated code and other runfiles-related issues.)
py_repl(
    name = "repl",
    preamble = [
        # Put statements here like "import tensorboard"
    ],
    deps = [":lib"],
)

# The public TensorBoard python library, bundled with the pip package and
# available via 'import tensorboard as tb' once installed.
py_library(
    name = "lib",
    srcs = ["__init__.py"],
    srcs_version = "PY3",
    visibility = ["//tensorbored:internal"],
    deps = [
        ":errors",
        ":lib_init_only",
        ":notebook",
        ":program",
        "//tensorbored/summary",
        "//tensorbored/summary:summary_v1",
        "//tensorbored/summary:summary_v2",
        "//tensorbored/summary/writer",
    ],
)

# The dependencies needed to initialize the `tensorboard` module itself,
# which are not sufficient to resolve all of its lazy imports. Use only
# if you're intending to link in a proper subset of TensorBoard's public
# API, you're linking in that subset explicitly in your downstream
# target, and you know what you're doing.
py_library(
    name = "lib_init_only",
    srcs = ["__init__.py"],
    srcs_version = "PY3",
    visibility = ["//visibility:public"],
    deps = [
        ":lazy",
        ":module_alias",
        ":version",
    ],
)

py_test(
    name = "lib_test",
    size = "small",
    srcs = ["lib_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    visibility = ["//tensorbored:internal"],
    deps = [":lib"],
)

py_library(
    name = "assets_lib",
    srcs = ["assets.py"],
    data = ["webfiles.zip"],
    srcs_version = "PY3",
    deps = [
        "//tensorbored/util:tb_logging",
    ],
)

py_test(
    name = "assets_lib_test",
    srcs = ["assets_test.py"],
    main = "assets_test.py",
    srcs_version = "PY3",
    deps = [
        ":assets_lib",
        "//tensorbored:test",
    ],
)

py_library(
    name = "auth",
    srcs = ["auth.py"],
    srcs_version = "PY3",
)

py_test(
    name = "auth_test",
    size = "small",
    srcs = ["auth_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":auth",
        "//tensorbored:test",
    ],
)

py_library(
    name = "context",
    srcs = ["context.py"],
    srcs_version = "PY3",
    visibility = ["//visibility:public"],
    deps = [
        ":auth",
    ],
)

py_test(
    name = "context_test",
    size = "small",
    srcs = ["context_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":auth",
        ":context",
        "//tensorbored:test",
    ],
)

py_library(
    name = "errors",
    srcs = ["errors.py"],
    srcs_version = "PY3",
)

py_test(
    name = "errors_test",
    srcs = ["errors_test.py"],
    srcs_version = "PY3",
    deps = [
        ":errors",
        ":test",
    ],
)

py_library(
    name = "manager",
    srcs = ["manager.py"],
    srcs_version = "PY3",
    visibility = ["//tensorbored:internal"],
    deps = [
        ":version",
        "//tensorbored/util:tb_logging",
    ],
)

py_test(
    name = "manager_test",
    size = "large",
    srcs = ["manager_test.py"],
    srcs_version = "PY3",
    tags = [
        "exclusive",
        "support_notf",
    ],
    visibility = ["//tensorbored:internal"],
    deps = [
        ":manager",
        ":test",
        ":version",
        "//tensorbored/util:tb_logging",
    ],
)

py_test(
    name = "manager_e2e_test",
    size = "large",  # spawns subprocesses, sleeps, makes requests to localhost
    timeout = "moderate",
    srcs = ["manager_e2e_test.py"],
    data = [
        ":tensorbored",
    ],
    # On Python 2, this test fails about 0.5% of the time when run with
    # high parallelism; TensorBoard subprocess time out instead of
    # launching successfully.
    flaky = True,
    srcs_version = "PY3",
    visibility = ["//tensorbored:internal"],
    deps = [
        ":manager",
        "//tensorbored:expect_tensorflow_installed",
    ],
)

py_library(
    name = "notebook",
    srcs = ["notebook.py"],
    srcs_version = "PY3",
    visibility = ["//visibility:public"],
    deps = [
        ":manager",
    ],
)

py_library(
    name = "program",
    srcs = ["program.py"],
    srcs_version = "PY3",
    deps = [
        ":manager",
        ":version",
        "//tensorbored:expect_absl_flags_installed",
        "//tensorbored/backend:application",
        "//tensorbored/backend/event_processing:data_ingester",
        "//tensorbored/backend/event_processing:event_file_inspector",
        "//tensorbored/data:server_ingester",
        "//tensorbored/plugins/core:core_plugin",
        "@org_pocoo_werkzeug",
    ],
)

py_test(
    name = "program_test",
    size = "large",
    srcs = ["program_test.py"],
    srcs_version = "PY3",
    tags = [
        "exclusive",
        "support_notf",
    ],
    deps = [
        ":default",
        ":program",
        ":test",
        "//tensorbored/plugins:base_plugin",
        "//tensorbored/plugins/core:core_plugin",
        "@org_pocoo_werkzeug",
    ],
)

py_library(
    name = "test",
    testonly = 1,
    srcs = ["test.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorbored:expect_absl_testing_absltest_installed",
        "//tensorbored/util:tb_logging",
    ],
)

py_library(
    name = "default",
    srcs = ["default.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorbored/backend:experimental_plugin",
        "//tensorbored/plugins/audio:audio_plugin",
        "//tensorbored/plugins/core:core_plugin",
        "//tensorbored/plugins/custom_scalar:custom_scalars_plugin",
        "//tensorbored/plugins/debugger_v2:debugger_v2_plugin",
        "//tensorbored/plugins/distribution:distributions_plugin",
        "//tensorbored/plugins/graph:graphs_plugin",
        "//tensorbored/plugins/histogram:histograms_plugin",
        "//tensorbored/plugins/hparams:hparams_plugin",
        "//tensorbored/plugins/image:images_plugin",
        "//tensorbored/plugins/mesh:mesh_plugin",
        "//tensorbored/plugins/metrics:metrics_plugin",
        "//tensorbored/plugins/pr_curve:pr_curves_plugin",
        "//tensorbored/plugins/profile_redirect:profile_redirect_plugin",
        "//tensorbored/plugins/scalar:scalars_plugin",
        "//tensorbored/plugins/text:text_plugin",
        "//tensorbored/plugins/wit_redirect:wit_redirect_plugin",
    ],
)

py_library(
    name = "dynamic_plugins",
    srcs_version = "PY3",
    deps = [
        "//tensorbored/plugins/projector:projector_plugin",
    ],
)

py_test(
    name = "default_test",
    size = "small",
    srcs = ["default_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":default",
        ":test",
        "//tensorbored/plugins:base_plugin",
    ],
)

py_library(
    name = "version",
    srcs = ["version.py"],
    srcs_version = "PY3",
)

py_test(
    name = "version_test",
    size = "small",
    srcs = ["version_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":test",
        ":version",
        "//tensorbored:expect_packaging_installed",
    ],
)

tensorboard_zip_file(
    name = "webfiles",
    deps = [":assets"],
)

tf_web_library(
    name = "assets",
    srcs = [
        "//tensorbored/webapp:index.html",
        "//tensorbored/webapp:index.js",
        "//tensorbored/webapp:svg_bundle",
        "//tensorbored/webapp/widgets/line_chart_v2/lib/worker:chart_worker.js",
    ],
    path = "/",
    suppress = ["strictDependencies"],
    deps = [
        "//tensorbored/webapp/widgets/source_code/monaco:monaco_editor",
        "//tensorbored/webapp/widgets/source_code/monaco:monaco_languages",
        "@com_google_fonts_ibm_plex_mono",
        "@com_google_fonts_inter",
        "@com_google_fonts_roboto",
    ],
)

tensorboard_zip_file(
    name = "dev_webfiles",
    deps = ["//tensorbored/webapp/dev_assets"],
)

# This is a dummy rule used as a numpy dependency in open-source.
# We expect numpy to already be installed on the system, e.g. via
# `pip install numpy`
py_library(name = "expect_numpy_installed")

# This is a dummy rule used as a pillow dependency in open-source.
# We expect pillow to already be installed on the system, e.g. via
# `pip install pillow`
py_library(name = "expect_pillow_installed")

# This is a dummy rule used as a grpc dependency in open-source.
# We expect grpc to already be installed on the system, e.g. via
# `pip install grpcio`
py_library(name = "expect_grpc_installed")

# This is a dummy rule used as a grpc_testing dependency in open-source.
# We expect grpc_testing to already be installed on the system, e.g. via
# `pip install grpcio_testing`
py_library(name = "expect_grpc_testing_installed")

# This is a dummy rule used as a TensorFlow dependency in open-source.
# We expect TensorFlow to already be installed on the system, e.g. via
# `pip install tensorflow`
#
# NOTE: we include the dep on //tensorbored/summary:tf_summary so that
# any TensorBoard code that depends on TF also depends on the tf.summary
# implementation code hosted by TensorBoard itself. This prevents the
# "Limited tf.compat.v2.summary API due to missing TensorBoard installation."
# warning that would otherwise be emitted when running via `bazel run` due
# to the bazel runfiles containing a `tensorboard` module that lacks that
# code, which hides the pip installation module that does have it.
py_library(
    name = "expect_tensorflow_installed",
    deps = [
        "//tensorbored/summary:tf_summary",
    ],
)

# This is a dummy rule used as a TensorFlow Datasets dependency in open-source.
# We expect TensorFlow Datasets to already be installed on the system, e.g. via
# `pip install tensorflow_datasets`
py_library(name = "expect_tensorflow_datasets_installed")

# This is a dummy rule used as a absl-py dependency in open-source.
# We expect absl-py to already be installed on the system, e.g. via
# `pip install absl-py`
py_library(name = "expect_absl_app_installed")

# This is a dummy rule used as a absl-py dependency in open-source.
# We expect absl-py to already be installed on the system, e.g. via
# `pip install absl-py`
py_library(name = "expect_absl_flags_installed")

# This is a dummy rule used as a absl-py dependency in open-source.
# We expect absl-py to already be installed on the system, e.g. via
# `pip install absl-py`
py_library(name = "expect_absl_logging_installed")

# This is a dummy rule used as a absl-py dependency in open-source.
# We expect absl-py to already be installed on the system, e.g. via
# `pip install absl-py`
py_library(name = "expect_absl_testing_absltest_installed")

# This is a dummy rule used as a packaging dependency in open-source.
# We expect packaging to already be installed on the system, e.g., via
# `pip install packaging`.
py_library(name = "expect_packaging_installed")

# This is a dummy rule used as a pkg-resources dependency in open-source.
# We expect pkg-resources to already be installed on the system, e.g., via
# `pip install setuptools`.
py_library(name = "expect_pkg_resources_installed")

# This is a dummy rule used as a pandas dependency in open-source.
# We expect pandas to already be installed on the system, e.g. via
# `pip install pandas`.
# NOTE: Unlike other parallel dependencies in this file, pandas is an
# optional dependency.
py_library(name = "expect_pandas_installed")

# This is a dummy rule used as a fsspec dependency in open-source.
# We expect fsspec to already be installed on the system, e.g. via
# `pip install fsspec`.
# NOTE: Unlike other parallel dependencies in this file, fsspec is an
# optional dependency.
py_library(name = "expect_fsspec_installed")

# This is a dummy rule used as a protobuf dependency in open-source.
# We expect protobuf to already be installed on the system, e.g. via
# `pip install protobuf`.
#
# Note that this dependency only represents the protobuf runtime library,
# it is not used for compiling .proto files to generated code, which is
# done by protoc as part of the build process. The protoc version may
# differ from the runtime version, but to be compatible, the runtime
# version should always be >= the protoc version.
py_library(name = "expect_protobuf_installed")

py_library(
    name = "data_compat",
    srcs = ["data_compat.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorbored:expect_protobuf_installed",
        "//tensorbored/compat/proto:protos_all_py_pb2",
        "//tensorbored/plugins/audio:metadata",
        "//tensorbored/plugins/histogram:metadata",
        "//tensorbored/plugins/image:metadata",
        "//tensorbored/plugins/scalar:metadata",
        "//tensorbored/util:tensor_util",
    ],
)

py_test(
    name = "data_compat_test",
    size = "small",
    srcs = ["data_compat_test.py"],
    srcs_version = "PY3",
    deps = [
        ":data_compat",
        "//tensorbored:expect_numpy_installed",
        "//tensorbored:expect_tensorflow_installed",
        "//tensorbored/compat/proto:protos_all_py_pb2",
        "//tensorbored/plugins/audio:metadata",
        "//tensorbored/plugins/audio:summary",
        "//tensorbored/plugins/histogram:metadata",
        "//tensorbored/plugins/histogram:summary",
        "//tensorbored/plugins/image:metadata",
        "//tensorbored/plugins/image:summary",
        "//tensorbored/plugins/scalar:metadata",
        "//tensorbored/plugins/scalar:summary",
        "//tensorbored/util:tensor_util",
    ],
)

py_library(
    name = "dataclass_compat",
    srcs = ["dataclass_compat.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorbored/compat/proto:protos_all_py_pb2",
        "//tensorbored/plugins/audio:metadata",
        "//tensorbored/plugins/custom_scalar:metadata",
        "//tensorbored/plugins/graph:metadata",
        "//tensorbored/plugins/histogram:metadata",
        "//tensorbored/plugins/hparams:metadata",
        "//tensorbored/plugins/image:metadata",
        "//tensorbored/plugins/mesh:metadata",
        "//tensorbored/plugins/pr_curve:metadata",
        "//tensorbored/plugins/scalar:metadata",
        "//tensorbored/plugins/text:metadata",
        "//tensorbored/util:tensor_util",
    ],
)

py_test(
    name = "dataclass_compat_test",
    size = "small",
    srcs = ["dataclass_compat_test.py"],
    srcs_version = "PY3",
    deps = [
        ":dataclass_compat",
        "//tensorbored:expect_numpy_installed",
        "//tensorbored:expect_tensorflow_installed",
        "//tensorbored/backend/event_processing:event_file_loader",
        "//tensorbored/compat/proto:protos_all_py_pb2",
        "//tensorbored/plugins/audio:metadata",
        "//tensorbored/plugins/audio:summary",
        "//tensorbored/plugins/graph:metadata",
        "//tensorbored/plugins/histogram:metadata",
        "//tensorbored/plugins/histogram:summary",
        "//tensorbored/plugins/hparams:metadata",
        "//tensorbored/plugins/hparams:summary_v2",
        "//tensorbored/plugins/pr_curve:metadata",
        "//tensorbored/plugins/pr_curve:summary",
        "//tensorbored/plugins/scalar:metadata",
        "//tensorbored/plugins/scalar:summary",
        "//tensorbored/util:tensor_util",
        "//tensorbored/util:test_util",
    ],
)

py_binary(
    name = "encode_png_benchmark",
    srcs = ["encode_png_benchmark.py"],
    srcs_version = "PY3",
    deps = [
        "//tensorbored:expect_absl_logging_installed",
        "//tensorbored:expect_numpy_installed",
        "//tensorbored:expect_tensorflow_installed",
        "//tensorbored/util:encoder",
        "//tensorbored/util:tb_logging",
    ],
)

py_library(
    name = "plugin_util",
    srcs = ["plugin_util.py"],
    srcs_version = "PY3",
    visibility = ["//visibility:public"],
    deps = [
        ":context",
        "//tensorbored:expect_protobuf_installed",
        "//tensorbored/backend:experiment_id",
        "//tensorbored/util:tb_logging",
        "@org_mozilla_bleach",
        "@org_pythonhosted_markdown",
    ],
)

py_test(
    name = "plugin_util_test",
    size = "small",
    srcs = ["plugin_util_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [
        ":context",
        ":plugin_util",
        ":test",
        "//tensorbored/backend:experiment_id",
    ],
)

alias(
    name = "summary",
    actual = "//tensorbored/summary",
    visibility = ["//tensorbored:internal"],
)

py_library(
    name = "lazy",
    srcs = ["lazy.py"],
    srcs_version = "PY3",
)

py_library(
    name = "module_alias",
    srcs = ["_module_alias.py"],
    srcs_version = "PY3",
)

py_test(
    name = "lazy_test",
    size = "small",
    srcs = ["lazy_test.py"],
    srcs_version = "PY3",
    tags = ["support_notf"],
    deps = [":lazy"],
)
