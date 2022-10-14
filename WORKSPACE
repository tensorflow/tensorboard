workspace(name = "org_tensorflow_tensorboard")

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
    name = "build_bazel_rules_apple",
    sha256 = "0052d452af7742c8f3a4e0929763388a66403de363775db7e90adecb2ba4944b",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_apple/releases/download/0.31.3/rules_apple.0.31.3.tar.gz",
        "https://github.com/bazelbuild/rules_apple/releases/download/0.31.3/rules_apple.0.31.3.tar.gz",
    ],
)

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

# Keep this version in sync with:
#  * The BAZEL environment variable defined in .github/workflows/ci.yml, which is used for CI and nightly builds.
versions.check(minimum_bazel_version = "4.0.0")

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

# Always bump the requirements.txt protobuf dep to be >= the version here.
# Keep this version to be in sync with TensorFlow:
# https://github.com/tensorflow/tensorflow/blob/master/tensorflow/workspace2.bzl#L446
# For other projects (e.g. Keras) depending on tb-nightly, generating protobuf code at
# a more recent version than the protobuf runtime supplied by TF's bazel build tooling
# might lead to test failures.
http_archive(
    name = "com_google_protobuf",
    patch_args = ["-p1"],
    patches = [
        # To maintain compatibility with python 3.10 and greater, we need to patch
        # in the following protobuf change:
        # https://github.com/grpc/grpc/commit/9d61eada0f47d7be793983638c4a29707b192d0c
        #
        # To reproduce the patch:
        # ```
        # $ git clone https://github.com/protocolbuffers/protobuf.git
        # $ cd protobuf
        # $ git checkout tags/v3.9.2 -b my-patch
        # $ git cherry-pick 9d61eada0f47d7be793983638c4a29707b192d0c
        # $ git diff HEAD~1 > protobuf.patch
        # # Remove trailing whitespace to satisify whitespace_hygiene_test.py.
        # $ sed -i 's/[[:space:]]*$//' protobuf.patch
        # ```
        "//third_party:protobuf.patch",
    ],
    sha256 = "1fbf1c2962af287607232b2eddeaec9b4f4a7a6f5934e1a9276e9af76952f7e0",
    strip_prefix = "protobuf-3.9.2",
    urls = [
        "http://mirror.tensorflow.org/github.com/protocolbuffers/protobuf/archive/v3.9.2.tar.gz",
        "https://github.com/protocolbuffers/protobuf/archive/v3.9.2.tar.gz",  # 2019-09-23
    ],
)

# gRPC.
http_archive(
    name = "com_github_grpc_grpc",
    patch_args = ["-p1"],
    patches = [
        # To maintain compatibility with python 3.10 and greater, we need to patch
        # in the following grpc change:
        # https://github.com/grpc/grpc/commit/dbe73c9004e483d24168c220cd589fe1824e72bc
        #
        # To reproduce the patch:
        # ```
        # $ git clone https://github.com/grpc/grpc.git
        # $ cd grpc
        # $ git checkout b54a5b338637f92bfcf4b0bc05e0f57a5fd8fadd -b my-patch
        # $ git cherry-pick dbe73c9004e483d24168c220cd589fe1824e72bc
        # $ git diff HEAD~1 > grpc.patch
        # ```
        #
        # Note that we choose b54a5b338637f92bfcf4b0bc05e0f57a5fd8fadd as the
        # base since it matches the archive (the commit number is in the archive
        # file's name). There is no exact corresponding tag to use but the
        # nearest might be v1.27.0-pre1.
        "//third_party:grpc.patch",
    ],
    sha256 = "b956598d8cbe168b5ee717b5dafa56563eb5201a947856a6688bbeac9cac4e1f",
    strip_prefix = "grpc-b54a5b338637f92bfcf4b0bc05e0f57a5fd8fadd",
    urls = [
        # Same as TF: https://github.com/tensorflow/tensorflow/blob/master/tensorflow/workspace2.bzl#L492
        # Currently we can't upgrade gRPC past 1.30.0 without also bumping protobuf to 3.12.0+:
        # https://github.com/grpc/grpc/issues/23311.
        #
        # Inspecting the contents of this archive, the version is v1.27.0-dev.
        "http://mirror.tensorflow.org/github.com/grpc/grpc/archive/b54a5b338637f92bfcf4b0bc05e0f57a5fd8fadd.tar.gz",
        "https://github.com/grpc/grpc/archive/b54a5b338637f92bfcf4b0bc05e0f57a5fd8fadd.tar.gz",
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
