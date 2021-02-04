workspace(name = "org_tensorflow_tensorboard")

load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

http_archive(
    name = "io_bazel_rules_webtesting",
    sha256 = "f89ca8e91ac53b3c61da356c685bf03e927f23b97b086cc593db8edc088c143f",
    urls = [
        # tag 0.3.1 resolves to commit afa8c4435ed8fd832046dab807ef998a26779ecb (2019-04-03 14:10:32 -0700)
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_webtesting/releases/download/0.3.1/rules_webtesting.tar.gz",
        "https://github.com/bazelbuild/rules_webtesting/releases/download/0.3.1/rules_webtesting.tar.gz",
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
    sha256 = "4952ef879704ab4ad6729a29007e7094aef213ea79e9f2e94cbe1c9a753e63ef",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_nodejs/releases/download/2.2.0/rules_nodejs-2.2.0.tar.gz",
        "https://github.com/bazelbuild/rules_nodejs/releases/download/2.2.0/rules_nodejs-2.2.0.tar.gz",
    ],
)

load("@build_bazel_rules_nodejs//:index.bzl", "yarn_install")

yarn_install(
    name = "npm",
    package_json = "//:package.json",
    # Opt out of symlinking local node_modules folder into bazel internal
    # directory.  Symlinking is incompatible with our toolchain which often
    # removes source directory without `bazel clean` which creates broken
    # symlink into node_modules folder.
    symlink_node_modules = False,
    yarn_lock = "//:yarn.lock",
)

http_archive(
    name = "io_bazel_rules_sass",
    sha256 = "9dcfba04e4af896626f4760d866f895ea4291bc30bf7287887cefcf4707b6a62",
    strip_prefix = "rules_sass-1.26.3",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_sass/archive/1.26.3.zip",
        "https://github.com/bazelbuild/rules_sass/archive/1.26.3.zip",
    ],
)

# Load @bazel/protractor dependencies
load("@npm//@bazel/protractor:package.bzl", "npm_bazel_protractor_dependencies")

npm_bazel_protractor_dependencies()

# Load @bazel/karma dependencies
load("@npm//@bazel/karma:package.bzl", "npm_bazel_karma_dependencies")

npm_bazel_karma_dependencies()

http_archive(
    name = "org_tensorflow",
    # NOTE: when updating this, MAKE SURE to also update the protobuf_js runtime version
    # in third_party/workspace.bzl to >= the protobuf/protoc version provided by TF.
    sha256 = "2595a5c401521f20a2734c4e5d54120996f8391f00bb62a57267d930bce95350",
    strip_prefix = "tensorflow-2.3.0",
    urls = [
        "http://mirror.tensorflow.org/github.com/tensorflow/tensorflow/archive/v2.3.0.tar.gz",  # 2020-07-23
        "https://github.com/tensorflow/tensorflow/archive/v2.3.0.tar.gz",
    ],
)

load("@org_tensorflow//tensorflow:workspace.bzl", "tf_workspace")

tf_workspace()

load("@bazel_skylib//lib:versions.bzl", "versions")

# Keep this version in sync with the BAZEL environment variable defined
# in our .github/workflows/ci.yml config.
versions.check(minimum_bazel_version = "3.7.0")

load("@io_bazel_rules_sass//:package.bzl", "rules_sass_dependencies")

rules_sass_dependencies()

load("@io_bazel_rules_sass//:defs.bzl", "sass_repositories")

sass_repositories()

load("@com_github_grpc_grpc//bazel:grpc_deps.bzl", "grpc_deps")

grpc_deps()

load("@upb//bazel:repository_defs.bzl", "bazel_version_repository")

bazel_version_repository(name = "bazel_version")

http_archive(
    name = "rules_rust",
    sha256 = "acd759b6fe99a3ae518ea6380e8e95653d27bb9e4a6a2a443abf48cb51fecaa7",
    strip_prefix = "rules_rust-d468cfa4820a156f850dab957b895d36ee0f4beb",
    urls = [
        # Master branch as of 2021-02-03
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_rust/archive/d468cfa4820a156f850dab957b895d36ee0f4beb.tar.gz",
        "https://github.com/bazelbuild/rules_rust/archive/d468cfa4820a156f850dab957b895d36ee0f4beb.tar.gz",
    ],
)

# Please add all new dependencies in workspace.bzl.
load("//third_party:workspace.bzl", "tensorboard_workspace")

tensorboard_workspace()
