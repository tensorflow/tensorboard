workspace(name = "org_tensorflow_tensorboard")

http_archive(
    name = "io_bazel_rules_closure",
    sha256 = "e9e2538b1f7f27de73fa2914b7d2cb1ce2ac01d1abe8390cfe51fb2558ef8b27",
    strip_prefix = "rules_closure-4c559574447f90751f05155faba4f3344668f666",
    urls = [
        "http://mirror.bazel.build/github.com/bazelbuild/rules_closure/archive/4c559574447f90751f05155faba4f3344668f666.tar.gz",
        "https://github.com/bazelbuild/rules_closure/archive/4c559574447f90751f05155faba4f3344668f666.tar.gz",  # 2017-06-21
    ],
)

load("@io_bazel_rules_closure//closure:defs.bzl", "closure_repositories")

closure_repositories()

http_archive(
    name = "io_bazel_rules_go",
    sha256 = "f7e42a4c1f9f31abff9b2bdee6fe4db18bc373287b7e07a5b844446e561e67e2",
    strip_prefix = "rules_go-4c9a52aba0b59511c5646af88d2f93a9c0193647",
    urls = [
        "http://mirror.bazel.build/github.com/bazelbuild/rules_go/archive/4c9a52aba0b59511c5646af88d2f93a9c0193647.tar.gz",  # 2017-05-05
        "https://github.com/bazelbuild/rules_go/archive/4c9a52aba0b59511c5646af88d2f93a9c0193647.tar.gz",
    ],
)

http_archive(
    name = "io_bazel_rules_webtesting",
    sha256 = "bb278df2afe88ed01490e4b25e2c048d453a518cb77d4795f6232a10fbae6c1f",
    strip_prefix = "rules_webtesting-dc0530015f201c2707085deba93ad210e89e6d18",
    urls = [
        "http://mirror.bazel.build/github.com/bazelbuild/rules_webtesting/archive/dc0530015f201c2707085deba93ad210e89e6d18.tar.gz",  # 2017-05-10
        "https://github.com/bazelbuild/rules_webtesting/archive/dc0530015f201c2707085deba93ad210e89e6d18.tar.gz",
    ],
)

load("@io_bazel_rules_go//go:def.bzl", "go_repositories")

go_repositories()

load("@io_bazel_rules_webtesting//web:repositories.bzl", "browser_repositories", "web_test_repositories")

web_test_repositories(
    omit_com_google_code_findbugs_jsr305 = True,
    omit_com_google_code_gson = True,
    omit_com_google_errorprone_error_prone_annotations = True,
    omit_com_google_guava = True,
    omit_junit = True,
    omit_org_hamcrest_core = True,
)

load("//third_party:workspace.bzl", "tensorboard_workspace")

# Please add all new dependencies in workspace.bzl.
tensorboard_workspace()

