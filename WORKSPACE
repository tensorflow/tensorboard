workspace(name = "org_tensorflow_tensorboard")

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
    name = "bazel_skylib",
    sha256 = "07b4117379dde7ab382345c3b0f5edfc6b7cff6c93756eac63da121e0bbcc5de",
    strip_prefix = "bazel-skylib-1.1.1",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/bazel-skylib/archive/1.1.1.tar.gz",
        "https://github.com/bazelbuild/bazel-skylib/releases/download/1.1.1/bazel-skylib-1.1.1.tar.gz",  # 2021-09-27
    ],
)

load("@bazel_skylib//lib:versions.bzl", "versions")

versions.check(
    # Preemptively assume the next Bazel major version will break us, since historically they do,
    # and provide a clean error message in that case. Since the maximum version is inclusive rather
    # than exclusive, we set it to the 999th patch release of the current major version.
    maximum_bazel_version = "6.999.0",
    # Keep this version in sync with:
    #  * The BAZEL environment variable defined in .github/workflows/ci.yml, which is used for CI and nightly builds.
    minimum_bazel_version = "4.2.2",
)

http_archive(
    name = "io_bazel_rules_webtesting",
    sha256 = "9bb461d5ef08e850025480bab185fd269242d4e533bca75bfb748001ceb343c3",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_webtesting/releases/download/0.3.3/rules_webtesting.tar.gz",
        "https://github.com/bazelbuild/rules_webtesting/releases/download/0.3.3/rules_webtesting.tar.gz",
    ],
)

load("@io_bazel_rules_webtesting//web:repositories.bzl", "web_test_repositories")

web_test_repositories(omit_bazel_skylib = True)

load("@io_bazel_rules_webtesting//web:py_repositories.bzl", "py_repositories")

py_repositories()

http_archive(
    name = "io_bazel_rules_closure",
    sha256 = "6a900831c1eb8dbfc9d6879b5820fd614d4ea1db180eb5ff8aedcb75ee747c1f",
    strip_prefix = "rules_closure-db4683a2a1836ac8e265804ca5fa31852395185b",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_closure/archive/db4683a2a1836ac8e265804ca5fa31852395185b.tar.gz",
        "https://github.com/bazelbuild/rules_closure/archive/db4683a2a1836ac8e265804ca5fa31852395185b.tar.gz",  # 2020-01-15
    ],
)

load("@io_bazel_rules_closure//closure:repositories.bzl", "rules_closure_dependencies")

rules_closure_dependencies(
    omit_bazel_skylib = True,
    omit_com_google_protobuf = True,
    omit_com_google_protobuf_js = True,
)

http_archive(
    name = "build_bazel_rules_nodejs",
    sha256 = "c29944ba9b0b430aadcaf3bf2570fece6fc5ebfb76df145c6cdad40d65c20811",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_nodejs/releases/download/5.7.0/rules_nodejs-5.7.0.tar.gz",
        "https://github.com/bazelbuild/rules_nodejs/releases/download/5.7.0/rules_nodejs-5.7.0.tar.gz",
    ],
)

load("@build_bazel_rules_nodejs//:repositories.bzl", "build_bazel_rules_nodejs_dependencies")

build_bazel_rules_nodejs_dependencies()

load("@build_bazel_rules_nodejs//:index.bzl", "yarn_install")

yarn_install(
    name = "npm",
    data = [
        "//patches:@angular+build-tooling+0.0.0-7d103b83a07f132629592fc9918ce17d42a5e382.patch",
        "//patches:@bazel+concatjs+5.7.0.patch",
    ],
    # "Some rules only work by referencing labels nested inside npm packages
    # and therefore require turning off exports_directories_only."
    # This includes "ts_library".
    # See: https://github.com/bazelbuild/rules_nodejs/wiki/Migrating-to-5.0#exports_directories_only
    exports_directories_only = False,
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
)

# Load esbuild rules for bazel.
# https://bazelbuild.github.io/rules_nodejs/esbuild.html
load("@build_bazel_rules_nodejs//toolchains/esbuild:esbuild_repositories.bzl", "esbuild_repositories")

esbuild_repositories(npm_repository = "npm")

# rules_sass release information is difficult to find but it does seem to
# regularly release with same cadence and version as core sass.
# We typically upgrade this library whenever we upgrade rules_nodejs.
#
# rules_sass 1.55.0: https://github.com/bazelbuild/rules_sass/tree/1.55.0
http_archive(
    name = "io_bazel_rules_sass",
    sha256 = "1ea0103fa6adcb7d43ff26373b5082efe1d4b2e09c4f34f8a8f8b351e9a8a9b0",
    strip_prefix = "rules_sass-1.55.0",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_sass/archive/1.55.0.zip",
        "https://github.com/bazelbuild/rules_sass/archive/1.55.0.zip",
    ],
)

load("@io_bazel_rules_sass//:defs.bzl", "sass_repositories")

sass_repositories()

# This dependency specifies the version of protobuf that will be used to compile
# protos as part of TensorBoard's build (i.e., the protoc version).
#
# The generated Python code for those protos relies on a Python runtime library,
# which is provided by the `protobuf` pip package. To ensure compatibility, the
# protoc version must be <= the runtime version. In our case, that means we must
# set the minimum `protobuf` version in our requirements.txt to be at least as
# high as the version of protobuf we depend on below, and we cannot increase the
# version below without bumping the requirements.txt version.
#
# TODO(#6185): Remove the TODO below once the TF constraint no longer applies.
#
# NOTE: This dependency currently cannot be advanced past 3.19.x. This is because
# TF is currently unable to use a runtime any greater than 3.19.x, see details here:
# https://github.com/tensorflow/tensorflow/blob/9d22f4a0a9499c8e10a4312503e63e0da35ccd94/tensorflow/tools/pip_package/setup.py#L100-L107
#
# As a result of TF's constraint and the above <= requirement, 3.19.x is the most recent
# possible protoc we can use while remaining cross-compatible with TF. At the same time,
# 3.19.x is the minimum possible protoc that will generate compiled proto code that *is*
# compatible with protobuf runtimes >= 4, as discussed here:
# https://developers.google.com/protocol-buffers/docs/news/2022-05-06
http_archive(
    name = "com_google_protobuf",
    sha256 = "9a301cf94a8ddcb380b901e7aac852780b826595075577bb967004050c835056",
    strip_prefix = "protobuf-3.19.6",
    urls = [
        "http://mirror.tensorflow.org/github.com/protocolbuffers/protobuf/archive/v3.19.6.tar.gz",
        "https://github.com/protocolbuffers/protobuf/archive/v3.19.6.tar.gz",  # 2022-09-29
    ],
)

# gRPC.
#
# NOTE: The version used here must be cross-compatible with our protobuf version.
# As 2023-01-13, 1.48.2 is the most recent gRPC release that was still using a 3.19.x
# version of protobuf in its own builds (more recent releases move to 3.21.x).
http_archive(
    name = "com_github_grpc_grpc",
    sha256 = "bdb8e98145469d58c69ab9f2c9e0bd838c2836a99b5760bc0ebf658623768f52",
    strip_prefix = "grpc-1.48.2",
    urls = [
        "http://mirror.tensorflow.org/github.com/grpc/grpc/archive/v1.48.2.tar.gz",
        "https://github.com/grpc/grpc/archive/v1.48.2.tar.gz",  # 2022-09-21
    ],
)

load("@com_github_grpc_grpc//bazel:grpc_deps.bzl", "grpc_deps")

grpc_deps()

load("@com_github_grpc_grpc//bazel:grpc_extra_deps.bzl", "grpc_extra_deps")

grpc_extra_deps()

http_archive(
    name = "rules_rust",
    sha256 = "08109dccfa5bbf674ff4dba82b15d40d85b07436b02e62ab27e0b894f45bb4a3",
    strip_prefix = "rules_rust-d5ab4143245af8b33d1947813d411a6cae838409",
    urls = [
        # Master branch as of 2022-01-31
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_rust/archive/d5ab4143245af8b33d1947813d411a6cae838409.tar.gz",
        "https://github.com/bazelbuild/rules_rust/archive/d5ab4143245af8b33d1947813d411a6cae838409.tar.gz",
    ],
)

# Please add all new dependencies in workspace.bzl.
load("//third_party:workspace.bzl", "tensorboard_workspace")

tensorboard_workspace()
