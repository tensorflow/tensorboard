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
    sha256 = "f9e7b9f42ae202cc2d2ce6d698ccb49a9f7f7ea572a78fd451696d03ef2ee116",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_nodejs/releases/download/1.6.0/rules_nodejs-1.6.0.tar.gz",
        "https://github.com/bazelbuild/rules_nodejs/releases/download/1.6.0/rules_nodejs-1.6.0.tar.gz",
    ],
)

load("@build_bazel_rules_nodejs//:index.bzl", "yarn_install")

yarn_install(
    name = "npm",
    package_json = "//:package.json",
    yarn_lock = "//:yarn.lock",
    # Opt out of symlinking local node_modules folder into bazel internal
    # directory.  Symlinking is incompatible with our toolchain which often
    # removes source directory without `bazel clean` which creates broken
    # symlink into node_modules folder.
    symlink_node_modules = False,
)

load("@npm//:install_bazel_dependencies.bzl", "install_bazel_dependencies")

install_bazel_dependencies()

http_archive(
    name = "io_bazel_rules_sass",
    sha256 = "9dcfba04e4af896626f4760d866f895ea4291bc30bf7287887cefcf4707b6a62",
    strip_prefix = "rules_sass-1.26.3",
    urls = [
        "http://mirror.tensorflow.org/github.com/bazelbuild/rules_sass/archive/1.26.3.zip",
        "https://github.com/bazelbuild/rules_sass/archive/1.26.3.zip",
    ],
)

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
# in our .travis.yml config.
versions.check(minimum_bazel_version = "2.1.0")

load("@io_bazel_rules_sass//:package.bzl", "rules_sass_dependencies")

rules_sass_dependencies()

load("@io_bazel_rules_sass//:defs.bzl", "sass_repositories")

sass_repositories()

load("@com_github_grpc_grpc//bazel:grpc_deps.bzl", "grpc_deps")

grpc_deps()

load("@upb//bazel:repository_defs.bzl", "bazel_version_repository")

bazel_version_repository(name = "bazel_version")

# Please add all new dependencies in workspace.bzl.
load("//third_party:workspace.bzl", "tensorboard_workspace")
tensorboard_workspace()
