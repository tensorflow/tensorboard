"""
@generated
cargo-raze generated Bazel file.

DO NOT EDIT! Replaced on runs of cargo-raze
"""

load("@bazel_tools//tools/build_defs/repo:git.bzl", "new_git_repository")  # buildifier: disable=load
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")  # buildifier: disable=load
load("@bazel_tools//tools/build_defs/repo:utils.bzl", "maybe")  # buildifier: disable=load

def raze_fetch_remote_crates():
    """This function defines a collection of repos and should be called in a WORKSPACE file"""
    maybe(
        http_archive,
        name = "raze__aho_corasick__0_7_15",
        url = "https://crates.io/api/v1/crates/aho-corasick/0.7.15/download",
        type = "tar.gz",
        sha256 = "7404febffaa47dac81aa44dba71523c9d069b1bdc50a77db41195149e17f68e5",
        strip_prefix = "aho-corasick-0.7.15",
        build_file = Label("//third_party/rust/remote:BUILD.aho-corasick-0.7.15.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__anyhow__1_0_34",
        url = "https://crates.io/api/v1/crates/anyhow/1.0.34/download",
        type = "tar.gz",
        sha256 = "bf8dcb5b4bbaa28653b647d8c77bd4ed40183b48882e130c1f1ffb73de069fd7",
        strip_prefix = "anyhow-1.0.34",
        build_file = Label("//third_party/rust/remote:BUILD.anyhow-1.0.34.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__async_stream__0_3_0",
        url = "https://crates.io/api/v1/crates/async-stream/0.3.0/download",
        type = "tar.gz",
        sha256 = "3670df70cbc01729f901f94c887814b3c68db038aad1329a418bae178bc5295c",
        strip_prefix = "async-stream-0.3.0",
        build_file = Label("//third_party/rust/remote:BUILD.async-stream-0.3.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__async_stream_impl__0_3_0",
        url = "https://crates.io/api/v1/crates/async-stream-impl/0.3.0/download",
        type = "tar.gz",
        sha256 = "a3548b8efc9f8e8a5a0a2808c5bd8451a9031b9e5b879a79590304ae928b0a70",
        strip_prefix = "async-stream-impl-0.3.0",
        build_file = Label("//third_party/rust/remote:BUILD.async-stream-impl-0.3.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__async_trait__0_1_41",
        url = "https://crates.io/api/v1/crates/async-trait/0.1.41/download",
        type = "tar.gz",
        sha256 = "b246867b8b3b6ae56035f1eb1ed557c1d8eae97f0d53696138a50fa0e3a3b8c0",
        strip_prefix = "async-trait-0.1.41",
        build_file = Label("//third_party/rust/remote:BUILD.async-trait-0.1.41.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__atty__0_2_14",
        url = "https://crates.io/api/v1/crates/atty/0.2.14/download",
        type = "tar.gz",
        sha256 = "d9b39be18770d11421cdb1b9947a45dd3f37e93092cbf377614828a319d5fee8",
        strip_prefix = "atty-0.2.14",
        build_file = Label("//third_party/rust/remote:BUILD.atty-0.2.14.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__autocfg__1_0_1",
        url = "https://crates.io/api/v1/crates/autocfg/1.0.1/download",
        type = "tar.gz",
        sha256 = "cdb031dd78e28731d87d56cc8ffef4a8f36ca26c38fe2de700543e627f8a464a",
        strip_prefix = "autocfg-1.0.1",
        build_file = Label("//third_party/rust/remote:BUILD.autocfg-1.0.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__base64__0_13_0",
        url = "https://crates.io/api/v1/crates/base64/0.13.0/download",
        type = "tar.gz",
        sha256 = "904dfeac50f3cdaba28fc6f57fdcddb75f49ed61346676a78c4ffe55877802fd",
        strip_prefix = "base64-0.13.0",
        build_file = Label("//third_party/rust/remote:BUILD.base64-0.13.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__bitflags__1_2_1",
        url = "https://crates.io/api/v1/crates/bitflags/1.2.1/download",
        type = "tar.gz",
        sha256 = "cf1de2fe8c75bc145a2f577add951f8134889b4795d47466a54a5c846d691693",
        strip_prefix = "bitflags-1.2.1",
        build_file = Label("//third_party/rust/remote:BUILD.bitflags-1.2.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__build_const__0_2_1",
        url = "https://crates.io/api/v1/crates/build_const/0.2.1/download",
        type = "tar.gz",
        sha256 = "39092a32794787acd8525ee150305ff051b0aa6cc2abaf193924f5ab05425f39",
        strip_prefix = "build_const-0.2.1",
        build_file = Label("//third_party/rust/remote:BUILD.build_const-0.2.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__bumpalo__3_6_0",
        url = "https://crates.io/api/v1/crates/bumpalo/3.6.0/download",
        type = "tar.gz",
        sha256 = "099e596ef14349721d9016f6b80dd3419ea1bf289ab9b44df8e4dfd3a005d5d9",
        strip_prefix = "bumpalo-3.6.0",
        build_file = Label("//third_party/rust/remote:BUILD.bumpalo-3.6.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__byteorder__1_3_4",
        url = "https://crates.io/api/v1/crates/byteorder/1.3.4/download",
        type = "tar.gz",
        sha256 = "08c48aae112d48ed9f069b33538ea9e3e90aa263cfa3d1c24309612b1f7472de",
        strip_prefix = "byteorder-1.3.4",
        build_file = Label("//third_party/rust/remote:BUILD.byteorder-1.3.4.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__bytes__0_5_6",
        url = "https://crates.io/api/v1/crates/bytes/0.5.6/download",
        type = "tar.gz",
        sha256 = "0e4cec68f03f32e44924783795810fa50a7035d8c8ebe78580ad7e6c703fba38",
        strip_prefix = "bytes-0.5.6",
        build_file = Label("//third_party/rust/remote:BUILD.bytes-0.5.6.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__bytes__1_0_1",
        url = "https://crates.io/api/v1/crates/bytes/1.0.1/download",
        type = "tar.gz",
        sha256 = "b700ce4376041dcd0a327fd0097c41095743c4c8af8887265942faf1100bd040",
        strip_prefix = "bytes-1.0.1",
        build_file = Label("//third_party/rust/remote:BUILD.bytes-1.0.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__cc__1_0_66",
        url = "https://crates.io/api/v1/crates/cc/1.0.66/download",
        type = "tar.gz",
        sha256 = "4c0496836a84f8d0495758516b8621a622beb77c0fed418570e50764093ced48",
        strip_prefix = "cc-1.0.66",
        build_file = Label("//third_party/rust/remote:BUILD.cc-1.0.66.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__cfg_if__0_1_10",
        url = "https://crates.io/api/v1/crates/cfg-if/0.1.10/download",
        type = "tar.gz",
        sha256 = "4785bdd1c96b2a846b2bd7cc02e86b6b3dbf14e7e53446c4f54c92a361040822",
        strip_prefix = "cfg-if-0.1.10",
        build_file = Label("//third_party/rust/remote:BUILD.cfg-if-0.1.10.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__cfg_if__1_0_0",
        url = "https://crates.io/api/v1/crates/cfg-if/1.0.0/download",
        type = "tar.gz",
        sha256 = "baf1de4339761588bc0619e3cbc0120ee582ebb74b53b4efbf79117bd2da40fd",
        strip_prefix = "cfg-if-1.0.0",
        build_file = Label("//third_party/rust/remote:BUILD.cfg-if-1.0.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__clap__3_0_0_beta_2",
        url = "https://crates.io/api/v1/crates/clap/3.0.0-beta.2/download",
        type = "tar.gz",
        sha256 = "4bd1061998a501ee7d4b6d449020df3266ca3124b941ec56cf2005c3779ca142",
        strip_prefix = "clap-3.0.0-beta.2",
        build_file = Label("//third_party/rust/remote:BUILD.clap-3.0.0-beta.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__clap_derive__3_0_0_beta_2",
        url = "https://crates.io/api/v1/crates/clap_derive/3.0.0-beta.2/download",
        type = "tar.gz",
        sha256 = "370f715b81112975b1b69db93e0b56ea4cd4e5002ac43b2da8474106a54096a1",
        strip_prefix = "clap_derive-3.0.0-beta.2",
        build_file = Label("//third_party/rust/remote:BUILD.clap_derive-3.0.0-beta.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__const_fn__0_4_5",
        url = "https://crates.io/api/v1/crates/const_fn/0.4.5/download",
        type = "tar.gz",
        sha256 = "28b9d6de7f49e22cf97ad17fc4036ece69300032f45f78f30b4a4482cdc3f4a6",
        strip_prefix = "const_fn-0.4.5",
        build_file = Label("//third_party/rust/remote:BUILD.const_fn-0.4.5.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__crc__1_8_1",
        url = "https://crates.io/api/v1/crates/crc/1.8.1/download",
        type = "tar.gz",
        sha256 = "d663548de7f5cca343f1e0a48d14dcfb0e9eb4e079ec58883b7251539fa10aeb",
        strip_prefix = "crc-1.8.1",
        build_file = Label("//third_party/rust/remote:BUILD.crc-1.8.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__crossbeam__0_8_0",
        url = "https://crates.io/api/v1/crates/crossbeam/0.8.0/download",
        type = "tar.gz",
        sha256 = "fd01a6eb3daaafa260f6fc94c3a6c36390abc2080e38e3e34ced87393fb77d80",
        strip_prefix = "crossbeam-0.8.0",
        build_file = Label("//third_party/rust/remote:BUILD.crossbeam-0.8.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__crossbeam_channel__0_5_0",
        url = "https://crates.io/api/v1/crates/crossbeam-channel/0.5.0/download",
        type = "tar.gz",
        sha256 = "dca26ee1f8d361640700bde38b2c37d8c22b3ce2d360e1fc1c74ea4b0aa7d775",
        strip_prefix = "crossbeam-channel-0.5.0",
        build_file = Label("//third_party/rust/remote:BUILD.crossbeam-channel-0.5.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__crossbeam_deque__0_8_1",
        url = "https://crates.io/api/v1/crates/crossbeam-deque/0.8.1/download",
        type = "tar.gz",
        sha256 = "6455c0ca19f0d2fbf751b908d5c55c1f5cbc65e03c4225427254b46890bdde1e",
        strip_prefix = "crossbeam-deque-0.8.1",
        build_file = Label("//third_party/rust/remote:BUILD.crossbeam-deque-0.8.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__crossbeam_epoch__0_9_1",
        url = "https://crates.io/api/v1/crates/crossbeam-epoch/0.9.1/download",
        type = "tar.gz",
        sha256 = "a1aaa739f95311c2c7887a76863f500026092fb1dce0161dab577e559ef3569d",
        strip_prefix = "crossbeam-epoch-0.9.1",
        build_file = Label("//third_party/rust/remote:BUILD.crossbeam-epoch-0.9.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__crossbeam_queue__0_3_1",
        url = "https://crates.io/api/v1/crates/crossbeam-queue/0.3.1/download",
        type = "tar.gz",
        sha256 = "0f6cb3c7f5b8e51bc3ebb73a2327ad4abdbd119dc13223f14f961d2f38486756",
        strip_prefix = "crossbeam-queue-0.3.1",
        build_file = Label("//third_party/rust/remote:BUILD.crossbeam-queue-0.3.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__crossbeam_utils__0_8_1",
        url = "https://crates.io/api/v1/crates/crossbeam-utils/0.8.1/download",
        type = "tar.gz",
        sha256 = "02d96d1e189ef58269ebe5b97953da3274d83a93af647c2ddd6f9dab28cedb8d",
        strip_prefix = "crossbeam-utils-0.8.1",
        build_file = Label("//third_party/rust/remote:BUILD.crossbeam-utils-0.8.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__either__1_6_1",
        url = "https://crates.io/api/v1/crates/either/1.6.1/download",
        type = "tar.gz",
        sha256 = "e78d4f1cc4ae33bbfc157ed5d5a5ef3bc29227303d595861deb238fcec4e9457",
        strip_prefix = "either-1.6.1",
        build_file = Label("//third_party/rust/remote:BUILD.either-1.6.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__encoding_rs__0_8_26",
        url = "https://crates.io/api/v1/crates/encoding_rs/0.8.26/download",
        type = "tar.gz",
        sha256 = "801bbab217d7f79c0062f4f7205b5d4427c6d1a7bd7aafdd1475f7c59d62b283",
        strip_prefix = "encoding_rs-0.8.26",
        build_file = Label("//third_party/rust/remote:BUILD.encoding_rs-0.8.26.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__env_logger__0_8_2",
        url = "https://crates.io/api/v1/crates/env_logger/0.8.2/download",
        type = "tar.gz",
        sha256 = "f26ecb66b4bdca6c1409b40fb255eefc2bd4f6d135dab3c3124f80ffa2a9661e",
        strip_prefix = "env_logger-0.8.2",
        build_file = Label("//third_party/rust/remote:BUILD.env_logger-0.8.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__fixedbitset__0_2_0",
        url = "https://crates.io/api/v1/crates/fixedbitset/0.2.0/download",
        type = "tar.gz",
        sha256 = "37ab347416e802de484e4d03c7316c48f1ecb56574dfd4a46a80f173ce1de04d",
        strip_prefix = "fixedbitset-0.2.0",
        build_file = Label("//third_party/rust/remote:BUILD.fixedbitset-0.2.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__fnv__1_0_7",
        url = "https://crates.io/api/v1/crates/fnv/1.0.7/download",
        type = "tar.gz",
        sha256 = "3f9eec918d3f24069decb9af1554cad7c880e2da24a9afd88aca000531ab82c1",
        strip_prefix = "fnv-1.0.7",
        build_file = Label("//third_party/rust/remote:BUILD.fnv-1.0.7.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__form_urlencoded__1_0_0",
        url = "https://crates.io/api/v1/crates/form_urlencoded/1.0.0/download",
        type = "tar.gz",
        sha256 = "ece68d15c92e84fa4f19d3780f1294e5ca82a78a6d515f1efaabcc144688be00",
        strip_prefix = "form_urlencoded-1.0.0",
        build_file = Label("//third_party/rust/remote:BUILD.form_urlencoded-1.0.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__futures_channel__0_3_8",
        url = "https://crates.io/api/v1/crates/futures-channel/0.3.8/download",
        type = "tar.gz",
        sha256 = "4b7109687aa4e177ef6fe84553af6280ef2778bdb7783ba44c9dc3399110fe64",
        strip_prefix = "futures-channel-0.3.8",
        build_file = Label("//third_party/rust/remote:BUILD.futures-channel-0.3.8.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__futures_core__0_3_12",
        url = "https://crates.io/api/v1/crates/futures-core/0.3.12/download",
        type = "tar.gz",
        sha256 = "79e5145dde8da7d1b3892dad07a9c98fc04bc39892b1ecc9692cf53e2b780a65",
        strip_prefix = "futures-core-0.3.12",
        build_file = Label("//third_party/rust/remote:BUILD.futures-core-0.3.12.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__futures_io__0_3_12",
        url = "https://crates.io/api/v1/crates/futures-io/0.3.12/download",
        type = "tar.gz",
        sha256 = "28be053525281ad8259d47e4de5de657b25e7bac113458555bb4b70bc6870500",
        strip_prefix = "futures-io-0.3.12",
        build_file = Label("//third_party/rust/remote:BUILD.futures-io-0.3.12.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__futures_macro__0_3_8",
        url = "https://crates.io/api/v1/crates/futures-macro/0.3.8/download",
        type = "tar.gz",
        sha256 = "77408a692f1f97bcc61dc001d752e00643408fbc922e4d634c655df50d595556",
        strip_prefix = "futures-macro-0.3.8",
        build_file = Label("//third_party/rust/remote:BUILD.futures-macro-0.3.8.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__futures_sink__0_3_8",
        url = "https://crates.io/api/v1/crates/futures-sink/0.3.8/download",
        type = "tar.gz",
        sha256 = "f878195a49cee50e006b02b93cf7e0a95a38ac7b776b4c4d9cc1207cd20fcb3d",
        strip_prefix = "futures-sink-0.3.8",
        build_file = Label("//third_party/rust/remote:BUILD.futures-sink-0.3.8.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__futures_task__0_3_8",
        url = "https://crates.io/api/v1/crates/futures-task/0.3.8/download",
        type = "tar.gz",
        sha256 = "7c554eb5bf48b2426c4771ab68c6b14468b6e76cc90996f528c3338d761a4d0d",
        strip_prefix = "futures-task-0.3.8",
        build_file = Label("//third_party/rust/remote:BUILD.futures-task-0.3.8.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__futures_util__0_3_8",
        url = "https://crates.io/api/v1/crates/futures-util/0.3.8/download",
        type = "tar.gz",
        sha256 = "d304cff4a7b99cfb7986f7d43fbe93d175e72e704a8860787cc95e9ffd85cbd2",
        strip_prefix = "futures-util-0.3.8",
        build_file = Label("//third_party/rust/remote:BUILD.futures-util-0.3.8.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__getrandom__0_1_15",
        url = "https://crates.io/api/v1/crates/getrandom/0.1.15/download",
        type = "tar.gz",
        sha256 = "fc587bc0ec293155d5bfa6b9891ec18a1e330c234f896ea47fbada4cadbe47e6",
        strip_prefix = "getrandom-0.1.15",
        build_file = Label("//third_party/rust/remote:BUILD.getrandom-0.1.15.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__getrandom__0_2_1",
        url = "https://crates.io/api/v1/crates/getrandom/0.2.1/download",
        type = "tar.gz",
        sha256 = "4060f4657be78b8e766215b02b18a2e862d83745545de804638e2b545e81aee6",
        strip_prefix = "getrandom-0.2.1",
        build_file = Label("//third_party/rust/remote:BUILD.getrandom-0.2.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__h2__0_3_0",
        url = "https://crates.io/api/v1/crates/h2/0.3.0/download",
        type = "tar.gz",
        sha256 = "6b67e66362108efccd8ac053abafc8b7a8d86a37e6e48fc4f6f7485eb5e9e6a5",
        strip_prefix = "h2-0.3.0",
        build_file = Label("//third_party/rust/remote:BUILD.h2-0.3.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__hashbrown__0_9_1",
        url = "https://crates.io/api/v1/crates/hashbrown/0.9.1/download",
        type = "tar.gz",
        sha256 = "d7afe4a420e3fe79967a00898cc1f4db7c8a49a9333a29f8a4bd76a253d5cd04",
        strip_prefix = "hashbrown-0.9.1",
        build_file = Label("//third_party/rust/remote:BUILD.hashbrown-0.9.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__heck__0_3_1",
        url = "https://crates.io/api/v1/crates/heck/0.3.1/download",
        type = "tar.gz",
        sha256 = "20564e78d53d2bb135c343b3f47714a56af2061f1c928fdb541dc7b9fdd94205",
        strip_prefix = "heck-0.3.1",
        build_file = Label("//third_party/rust/remote:BUILD.heck-0.3.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__hermit_abi__0_1_17",
        url = "https://crates.io/api/v1/crates/hermit-abi/0.1.17/download",
        type = "tar.gz",
        sha256 = "5aca5565f760fb5b220e499d72710ed156fdb74e631659e99377d9ebfbd13ae8",
        strip_prefix = "hermit-abi-0.1.17",
        build_file = Label("//third_party/rust/remote:BUILD.hermit-abi-0.1.17.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__http__0_2_1",
        url = "https://crates.io/api/v1/crates/http/0.2.1/download",
        type = "tar.gz",
        sha256 = "28d569972648b2c512421b5f2a405ad6ac9666547189d0c5477a3f200f3e02f9",
        strip_prefix = "http-0.2.1",
        build_file = Label("//third_party/rust/remote:BUILD.http-0.2.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__http_body__0_4_0",
        url = "https://crates.io/api/v1/crates/http-body/0.4.0/download",
        type = "tar.gz",
        sha256 = "2861bd27ee074e5ee891e8b539837a9430012e249d7f0ca2d795650f579c1994",
        strip_prefix = "http-body-0.4.0",
        build_file = Label("//third_party/rust/remote:BUILD.http-body-0.4.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__httparse__1_3_4",
        url = "https://crates.io/api/v1/crates/httparse/1.3.4/download",
        type = "tar.gz",
        sha256 = "cd179ae861f0c2e53da70d892f5f3029f9594be0c41dc5269cd371691b1dc2f9",
        strip_prefix = "httparse-1.3.4",
        build_file = Label("//third_party/rust/remote:BUILD.httparse-1.3.4.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__httpdate__0_3_2",
        url = "https://crates.io/api/v1/crates/httpdate/0.3.2/download",
        type = "tar.gz",
        sha256 = "494b4d60369511e7dea41cf646832512a94e542f68bb9c49e54518e0f468eb47",
        strip_prefix = "httpdate-0.3.2",
        build_file = Label("//third_party/rust/remote:BUILD.httpdate-0.3.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__humantime__2_0_1",
        url = "https://crates.io/api/v1/crates/humantime/2.0.1/download",
        type = "tar.gz",
        sha256 = "3c1ad908cc71012b7bea4d0c53ba96a8cba9962f048fa68d143376143d863b7a",
        strip_prefix = "humantime-2.0.1",
        build_file = Label("//third_party/rust/remote:BUILD.humantime-2.0.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__hyper__0_14_2",
        url = "https://crates.io/api/v1/crates/hyper/0.14.2/download",
        type = "tar.gz",
        sha256 = "12219dc884514cb4a6a03737f4413c0e01c23a1b059b0156004b23f1e19dccbe",
        strip_prefix = "hyper-0.14.2",
        build_file = Label("//third_party/rust/remote:BUILD.hyper-0.14.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__hyper_rustls__0_22_1",
        url = "https://crates.io/api/v1/crates/hyper-rustls/0.22.1/download",
        type = "tar.gz",
        sha256 = "5f9f7a97316d44c0af9b0301e65010573a853a9fc97046d7331d7f6bc0fd5a64",
        strip_prefix = "hyper-rustls-0.22.1",
        build_file = Label("//third_party/rust/remote:BUILD.hyper-rustls-0.22.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__idna__0_2_0",
        url = "https://crates.io/api/v1/crates/idna/0.2.0/download",
        type = "tar.gz",
        sha256 = "02e2673c30ee86b5b96a9cb52ad15718aa1f966f5ab9ad54a8b95d5ca33120a9",
        strip_prefix = "idna-0.2.0",
        build_file = Label("//third_party/rust/remote:BUILD.idna-0.2.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__indexmap__1_6_0",
        url = "https://crates.io/api/v1/crates/indexmap/1.6.0/download",
        type = "tar.gz",
        sha256 = "55e2e4c765aa53a0424761bf9f41aa7a6ac1efa87238f59560640e27fca028f2",
        strip_prefix = "indexmap-1.6.0",
        build_file = Label("//third_party/rust/remote:BUILD.indexmap-1.6.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__ipnet__2_3_0",
        url = "https://crates.io/api/v1/crates/ipnet/2.3.0/download",
        type = "tar.gz",
        sha256 = "47be2f14c678be2fdcab04ab1171db51b2762ce6f0a8ee87c8dd4a04ed216135",
        strip_prefix = "ipnet-2.3.0",
        build_file = Label("//third_party/rust/remote:BUILD.ipnet-2.3.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__itertools__0_9_0",
        url = "https://crates.io/api/v1/crates/itertools/0.9.0/download",
        type = "tar.gz",
        sha256 = "284f18f85651fe11e8a991b2adb42cb078325c996ed026d994719efcfca1d54b",
        strip_prefix = "itertools-0.9.0",
        build_file = Label("//third_party/rust/remote:BUILD.itertools-0.9.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__itoa__0_4_6",
        url = "https://crates.io/api/v1/crates/itoa/0.4.6/download",
        type = "tar.gz",
        sha256 = "dc6f3ad7b9d11a0c00842ff8de1b60ee58661048eb8049ed33c73594f359d7e6",
        strip_prefix = "itoa-0.4.6",
        build_file = Label("//third_party/rust/remote:BUILD.itoa-0.4.6.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__js_sys__0_3_47",
        url = "https://crates.io/api/v1/crates/js-sys/0.3.47/download",
        type = "tar.gz",
        sha256 = "5cfb73131c35423a367daf8cbd24100af0d077668c8c2943f0e7dd775fef0f65",
        strip_prefix = "js-sys-0.3.47",
        build_file = Label("//third_party/rust/remote:BUILD.js-sys-0.3.47.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__lazy_static__1_4_0",
        url = "https://crates.io/api/v1/crates/lazy_static/1.4.0/download",
        type = "tar.gz",
        sha256 = "e2abad23fbc42b3700f2f279844dc832adb2b2eb069b2df918f455c4e18cc646",
        strip_prefix = "lazy_static-1.4.0",
        build_file = Label("//third_party/rust/remote:BUILD.lazy_static-1.4.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__libc__0_2_80",
        url = "https://crates.io/api/v1/crates/libc/0.2.80/download",
        type = "tar.gz",
        sha256 = "4d58d1b70b004888f764dfbf6a26a3b0342a1632d33968e4a179d8011c760614",
        strip_prefix = "libc-0.2.80",
        build_file = Label("//third_party/rust/remote:BUILD.libc-0.2.80.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__log__0_4_11",
        url = "https://crates.io/api/v1/crates/log/0.4.11/download",
        type = "tar.gz",
        sha256 = "4fabed175da42fed1fa0746b0ea71f412aa9d35e76e95e59b192c64b9dc2bf8b",
        strip_prefix = "log-0.4.11",
        build_file = Label("//third_party/rust/remote:BUILD.log-0.4.11.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__matches__0_1_8",
        url = "https://crates.io/api/v1/crates/matches/0.1.8/download",
        type = "tar.gz",
        sha256 = "7ffc5c5338469d4d3ea17d269fa8ea3512ad247247c30bd2df69e68309ed0a08",
        strip_prefix = "matches-0.1.8",
        build_file = Label("//third_party/rust/remote:BUILD.matches-0.1.8.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__memchr__2_3_4",
        url = "https://crates.io/api/v1/crates/memchr/2.3.4/download",
        type = "tar.gz",
        sha256 = "0ee1c47aaa256ecabcaea351eae4a9b01ef39ed810004e298d2511ed284b1525",
        strip_prefix = "memchr-2.3.4",
        build_file = Label("//third_party/rust/remote:BUILD.memchr-2.3.4.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__memoffset__0_6_1",
        url = "https://crates.io/api/v1/crates/memoffset/0.6.1/download",
        type = "tar.gz",
        sha256 = "157b4208e3059a8f9e78d559edc658e13df41410cb3ae03979c83130067fdd87",
        strip_prefix = "memoffset-0.6.1",
        build_file = Label("//third_party/rust/remote:BUILD.memoffset-0.6.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__mime__0_3_16",
        url = "https://crates.io/api/v1/crates/mime/0.3.16/download",
        type = "tar.gz",
        sha256 = "2a60c7ce501c71e03a9c9c0d35b861413ae925bd979cc7a4e30d060069aaac8d",
        strip_prefix = "mime-0.3.16",
        build_file = Label("//third_party/rust/remote:BUILD.mime-0.3.16.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__mio__0_7_7",
        url = "https://crates.io/api/v1/crates/mio/0.7.7/download",
        type = "tar.gz",
        sha256 = "e50ae3f04d169fcc9bde0b547d1c205219b7157e07ded9c5aff03e0637cb3ed7",
        strip_prefix = "mio-0.7.7",
        build_file = Label("//third_party/rust/remote:BUILD.mio-0.7.7.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__miow__0_3_6",
        url = "https://crates.io/api/v1/crates/miow/0.3.6/download",
        type = "tar.gz",
        sha256 = "5a33c1b55807fbed163481b5ba66db4b2fa6cde694a5027be10fb724206c5897",
        strip_prefix = "miow-0.3.6",
        build_file = Label("//third_party/rust/remote:BUILD.miow-0.3.6.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__multimap__0_8_2",
        url = "https://crates.io/api/v1/crates/multimap/0.8.2/download",
        type = "tar.gz",
        sha256 = "1255076139a83bb467426e7f8d0134968a8118844faa755985e077cf31850333",
        strip_prefix = "multimap-0.8.2",
        build_file = Label("//third_party/rust/remote:BUILD.multimap-0.8.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__ntapi__0_3_6",
        url = "https://crates.io/api/v1/crates/ntapi/0.3.6/download",
        type = "tar.gz",
        sha256 = "3f6bb902e437b6d86e03cce10a7e2af662292c5dfef23b65899ea3ac9354ad44",
        strip_prefix = "ntapi-0.3.6",
        build_file = Label("//third_party/rust/remote:BUILD.ntapi-0.3.6.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__num_cpus__1_13_0",
        url = "https://crates.io/api/v1/crates/num_cpus/1.13.0/download",
        type = "tar.gz",
        sha256 = "05499f3756671c15885fee9034446956fff3f243d6077b91e5767df161f766b3",
        strip_prefix = "num_cpus-1.13.0",
        build_file = Label("//third_party/rust/remote:BUILD.num_cpus-1.13.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__once_cell__1_5_2",
        url = "https://crates.io/api/v1/crates/once_cell/1.5.2/download",
        type = "tar.gz",
        sha256 = "13bd41f508810a131401606d54ac32a467c97172d74ba7662562ebba5ad07fa0",
        strip_prefix = "once_cell-1.5.2",
        build_file = Label("//third_party/rust/remote:BUILD.once_cell-1.5.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__os_str_bytes__2_4_0",
        url = "https://crates.io/api/v1/crates/os_str_bytes/2.4.0/download",
        type = "tar.gz",
        sha256 = "afb2e1c3ee07430c2cf76151675e583e0f19985fa6efae47d6848a3e2c824f85",
        strip_prefix = "os_str_bytes-2.4.0",
        build_file = Label("//third_party/rust/remote:BUILD.os_str_bytes-2.4.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__percent_encoding__2_1_0",
        url = "https://crates.io/api/v1/crates/percent-encoding/2.1.0/download",
        type = "tar.gz",
        sha256 = "d4fd5641d01c8f18a23da7b6fe29298ff4b55afcccdf78973b24cf3175fee32e",
        strip_prefix = "percent-encoding-2.1.0",
        build_file = Label("//third_party/rust/remote:BUILD.percent-encoding-2.1.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__petgraph__0_5_1",
        url = "https://crates.io/api/v1/crates/petgraph/0.5.1/download",
        type = "tar.gz",
        sha256 = "467d164a6de56270bd7c4d070df81d07beace25012d5103ced4e9ff08d6afdb7",
        strip_prefix = "petgraph-0.5.1",
        build_file = Label("//third_party/rust/remote:BUILD.petgraph-0.5.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__pin_project__0_4_27",
        url = "https://crates.io/api/v1/crates/pin-project/0.4.27/download",
        type = "tar.gz",
        sha256 = "2ffbc8e94b38ea3d2d8ba92aea2983b503cd75d0888d75b86bb37970b5698e15",
        strip_prefix = "pin-project-0.4.27",
        build_file = Label("//third_party/rust/remote:BUILD.pin-project-0.4.27.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__pin_project__1_0_1",
        url = "https://crates.io/api/v1/crates/pin-project/1.0.1/download",
        type = "tar.gz",
        sha256 = "ee41d838744f60d959d7074e3afb6b35c7456d0f61cad38a24e35e6553f73841",
        strip_prefix = "pin-project-1.0.1",
        build_file = Label("//third_party/rust/remote:BUILD.pin-project-1.0.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__pin_project_internal__0_4_27",
        url = "https://crates.io/api/v1/crates/pin-project-internal/0.4.27/download",
        type = "tar.gz",
        sha256 = "65ad2ae56b6abe3a1ee25f15ee605bacadb9a764edaba9c2bf4103800d4a1895",
        strip_prefix = "pin-project-internal-0.4.27",
        build_file = Label("//third_party/rust/remote:BUILD.pin-project-internal-0.4.27.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__pin_project_internal__1_0_1",
        url = "https://crates.io/api/v1/crates/pin-project-internal/1.0.1/download",
        type = "tar.gz",
        sha256 = "81a4ffa594b66bff340084d4081df649a7dc049ac8d7fc458d8e628bfbbb2f86",
        strip_prefix = "pin-project-internal-1.0.1",
        build_file = Label("//third_party/rust/remote:BUILD.pin-project-internal-1.0.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__pin_project_lite__0_1_11",
        url = "https://crates.io/api/v1/crates/pin-project-lite/0.1.11/download",
        type = "tar.gz",
        sha256 = "c917123afa01924fc84bb20c4c03f004d9c38e5127e3c039bbf7f4b9c76a2f6b",
        strip_prefix = "pin-project-lite-0.1.11",
        build_file = Label("//third_party/rust/remote:BUILD.pin-project-lite-0.1.11.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__pin_project_lite__0_2_4",
        url = "https://crates.io/api/v1/crates/pin-project-lite/0.2.4/download",
        type = "tar.gz",
        sha256 = "439697af366c49a6d0a010c56a0d97685bc140ce0d377b13a2ea2aa42d64a827",
        strip_prefix = "pin-project-lite-0.2.4",
        build_file = Label("//third_party/rust/remote:BUILD.pin-project-lite-0.2.4.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__pin_utils__0_1_0",
        url = "https://crates.io/api/v1/crates/pin-utils/0.1.0/download",
        type = "tar.gz",
        sha256 = "8b870d8c151b6f2fb93e84a13146138f05d02ed11c7e7c54f8826aaaf7c9f184",
        strip_prefix = "pin-utils-0.1.0",
        build_file = Label("//third_party/rust/remote:BUILD.pin-utils-0.1.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__ppv_lite86__0_2_10",
        url = "https://crates.io/api/v1/crates/ppv-lite86/0.2.10/download",
        type = "tar.gz",
        sha256 = "ac74c624d6b2d21f425f752262f42188365d7b8ff1aff74c82e45136510a4857",
        strip_prefix = "ppv-lite86-0.2.10",
        build_file = Label("//third_party/rust/remote:BUILD.ppv-lite86-0.2.10.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__proc_macro_error__1_0_4",
        url = "https://crates.io/api/v1/crates/proc-macro-error/1.0.4/download",
        type = "tar.gz",
        sha256 = "da25490ff9892aab3fcf7c36f08cfb902dd3e71ca0f9f9517bea02a73a5ce38c",
        strip_prefix = "proc-macro-error-1.0.4",
        build_file = Label("//third_party/rust/remote:BUILD.proc-macro-error-1.0.4.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__proc_macro_error_attr__1_0_4",
        url = "https://crates.io/api/v1/crates/proc-macro-error-attr/1.0.4/download",
        type = "tar.gz",
        sha256 = "a1be40180e52ecc98ad80b184934baf3d0d29f979574e439af5a55274b35f869",
        strip_prefix = "proc-macro-error-attr-1.0.4",
        build_file = Label("//third_party/rust/remote:BUILD.proc-macro-error-attr-1.0.4.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__proc_macro_hack__0_5_19",
        url = "https://crates.io/api/v1/crates/proc-macro-hack/0.5.19/download",
        type = "tar.gz",
        sha256 = "dbf0c48bc1d91375ae5c3cd81e3722dff1abcf81a30960240640d223f59fe0e5",
        strip_prefix = "proc-macro-hack-0.5.19",
        build_file = Label("//third_party/rust/remote:BUILD.proc-macro-hack-0.5.19.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__proc_macro_nested__0_1_7",
        url = "https://crates.io/api/v1/crates/proc-macro-nested/0.1.7/download",
        type = "tar.gz",
        sha256 = "bc881b2c22681370c6a780e47af9840ef841837bc98118431d4e1868bd0c1086",
        strip_prefix = "proc-macro-nested-0.1.7",
        build_file = Label("//third_party/rust/remote:BUILD.proc-macro-nested-0.1.7.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__proc_macro2__1_0_24",
        url = "https://crates.io/api/v1/crates/proc-macro2/1.0.24/download",
        type = "tar.gz",
        sha256 = "1e0704ee1a7e00d7bb417d0770ea303c1bccbabf0ef1667dae92b5967f5f8a71",
        strip_prefix = "proc-macro2-1.0.24",
        build_file = Label("//third_party/rust/remote:BUILD.proc-macro2-1.0.24.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__prost__0_7_0",
        url = "https://crates.io/api/v1/crates/prost/0.7.0/download",
        type = "tar.gz",
        sha256 = "9e6984d2f1a23009bd270b8bb56d0926810a3d483f59c987d77969e9d8e840b2",
        strip_prefix = "prost-0.7.0",
        build_file = Label("//third_party/rust/remote:BUILD.prost-0.7.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__prost_build__0_7_0",
        url = "https://crates.io/api/v1/crates/prost-build/0.7.0/download",
        type = "tar.gz",
        sha256 = "32d3ebd75ac2679c2af3a92246639f9fcc8a442ee420719cc4fe195b98dd5fa3",
        strip_prefix = "prost-build-0.7.0",
        build_file = Label("//third_party/rust/remote:BUILD.prost-build-0.7.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__prost_derive__0_7_0",
        url = "https://crates.io/api/v1/crates/prost-derive/0.7.0/download",
        type = "tar.gz",
        sha256 = "169a15f3008ecb5160cba7d37bcd690a7601b6d30cfb87a117d45e59d52af5d4",
        strip_prefix = "prost-derive-0.7.0",
        build_file = Label("//third_party/rust/remote:BUILD.prost-derive-0.7.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__prost_types__0_7_0",
        url = "https://crates.io/api/v1/crates/prost-types/0.7.0/download",
        type = "tar.gz",
        sha256 = "b518d7cdd93dab1d1122cf07fa9a60771836c668dde9d9e2a139f957f0d9f1bb",
        strip_prefix = "prost-types-0.7.0",
        build_file = Label("//third_party/rust/remote:BUILD.prost-types-0.7.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__quote__1_0_7",
        url = "https://crates.io/api/v1/crates/quote/1.0.7/download",
        type = "tar.gz",
        sha256 = "aa563d17ecb180e500da1cfd2b028310ac758de548efdd203e18f283af693f37",
        strip_prefix = "quote-1.0.7",
        build_file = Label("//third_party/rust/remote:BUILD.quote-1.0.7.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__rand__0_7_3",
        url = "https://crates.io/api/v1/crates/rand/0.7.3/download",
        type = "tar.gz",
        sha256 = "6a6b1679d49b24bbfe0c803429aa1874472f50d9b363131f0e89fc356b544d03",
        strip_prefix = "rand-0.7.3",
        build_file = Label("//third_party/rust/remote:BUILD.rand-0.7.3.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__rand__0_8_2",
        url = "https://crates.io/api/v1/crates/rand/0.8.2/download",
        type = "tar.gz",
        sha256 = "18519b42a40024d661e1714153e9ad0c3de27cd495760ceb09710920f1098b1e",
        strip_prefix = "rand-0.8.2",
        build_file = Label("//third_party/rust/remote:BUILD.rand-0.8.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__rand_chacha__0_2_2",
        url = "https://crates.io/api/v1/crates/rand_chacha/0.2.2/download",
        type = "tar.gz",
        sha256 = "f4c8ed856279c9737206bf725bf36935d8666ead7aa69b52be55af369d193402",
        strip_prefix = "rand_chacha-0.2.2",
        build_file = Label("//third_party/rust/remote:BUILD.rand_chacha-0.2.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__rand_chacha__0_3_0",
        url = "https://crates.io/api/v1/crates/rand_chacha/0.3.0/download",
        type = "tar.gz",
        sha256 = "e12735cf05c9e10bf21534da50a147b924d555dc7a547c42e6bb2d5b6017ae0d",
        strip_prefix = "rand_chacha-0.3.0",
        build_file = Label("//third_party/rust/remote:BUILD.rand_chacha-0.3.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__rand_core__0_5_1",
        url = "https://crates.io/api/v1/crates/rand_core/0.5.1/download",
        type = "tar.gz",
        sha256 = "90bde5296fc891b0cef12a6d03ddccc162ce7b2aff54160af9338f8d40df6d19",
        strip_prefix = "rand_core-0.5.1",
        build_file = Label("//third_party/rust/remote:BUILD.rand_core-0.5.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__rand_core__0_6_1",
        url = "https://crates.io/api/v1/crates/rand_core/0.6.1/download",
        type = "tar.gz",
        sha256 = "c026d7df8b298d90ccbbc5190bd04d85e159eaf5576caeacf8741da93ccbd2e5",
        strip_prefix = "rand_core-0.6.1",
        build_file = Label("//third_party/rust/remote:BUILD.rand_core-0.6.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__rand_hc__0_2_0",
        url = "https://crates.io/api/v1/crates/rand_hc/0.2.0/download",
        type = "tar.gz",
        sha256 = "ca3129af7b92a17112d59ad498c6f81eaf463253766b90396d39ea7a39d6613c",
        strip_prefix = "rand_hc-0.2.0",
        build_file = Label("//third_party/rust/remote:BUILD.rand_hc-0.2.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__rand_hc__0_3_0",
        url = "https://crates.io/api/v1/crates/rand_hc/0.3.0/download",
        type = "tar.gz",
        sha256 = "3190ef7066a446f2e7f42e239d161e905420ccab01eb967c9eb27d21b2322a73",
        strip_prefix = "rand_hc-0.3.0",
        build_file = Label("//third_party/rust/remote:BUILD.rand_hc-0.3.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__rayon__1_5_0",
        url = "https://crates.io/api/v1/crates/rayon/1.5.0/download",
        type = "tar.gz",
        sha256 = "8b0d8e0819fadc20c74ea8373106ead0600e3a67ef1fe8da56e39b9ae7275674",
        strip_prefix = "rayon-1.5.0",
        build_file = Label("//third_party/rust/remote:BUILD.rayon-1.5.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__rayon_core__1_9_0",
        url = "https://crates.io/api/v1/crates/rayon-core/1.9.0/download",
        type = "tar.gz",
        sha256 = "9ab346ac5921dc62ffa9f89b7a773907511cdfa5490c572ae9be1be33e8afa4a",
        strip_prefix = "rayon-core-1.9.0",
        build_file = Label("//third_party/rust/remote:BUILD.rayon-core-1.9.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__redox_syscall__0_1_57",
        url = "https://crates.io/api/v1/crates/redox_syscall/0.1.57/download",
        type = "tar.gz",
        sha256 = "41cc0f7e4d5d4544e8861606a285bb08d3e70712ccc7d2b84d7c0ccfaf4b05ce",
        strip_prefix = "redox_syscall-0.1.57",
        build_file = Label("//third_party/rust/remote:BUILD.redox_syscall-0.1.57.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__regex__1_4_2",
        url = "https://crates.io/api/v1/crates/regex/1.4.2/download",
        type = "tar.gz",
        sha256 = "38cf2c13ed4745de91a5eb834e11c00bcc3709e773173b2ce4c56c9fbde04b9c",
        strip_prefix = "regex-1.4.2",
        build_file = Label("//third_party/rust/remote:BUILD.regex-1.4.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__regex_syntax__0_6_21",
        url = "https://crates.io/api/v1/crates/regex-syntax/0.6.21/download",
        type = "tar.gz",
        sha256 = "3b181ba2dcf07aaccad5448e8ead58db5b742cf85dfe035e2227f137a539a189",
        strip_prefix = "regex-syntax-0.6.21",
        build_file = Label("//third_party/rust/remote:BUILD.regex-syntax-0.6.21.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__remove_dir_all__0_5_3",
        url = "https://crates.io/api/v1/crates/remove_dir_all/0.5.3/download",
        type = "tar.gz",
        sha256 = "3acd125665422973a33ac9d3dd2df85edad0f4ae9b00dafb1a05e43a9f5ef8e7",
        strip_prefix = "remove_dir_all-0.5.3",
        build_file = Label("//third_party/rust/remote:BUILD.remove_dir_all-0.5.3.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__reqwest__0_11_0",
        url = "https://crates.io/api/v1/crates/reqwest/0.11.0/download",
        type = "tar.gz",
        sha256 = "fd281b1030aa675fb90aa994d07187645bb3c8fc756ca766e7c3070b439de9de",
        strip_prefix = "reqwest-0.11.0",
        build_file = Label("//third_party/rust/remote:BUILD.reqwest-0.11.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__ring__0_16_20",
        url = "https://crates.io/api/v1/crates/ring/0.16.20/download",
        type = "tar.gz",
        sha256 = "3053cf52e236a3ed746dfc745aa9cacf1b791d846bdaf412f60a8d7d6e17c8fc",
        strip_prefix = "ring-0.16.20",
        build_file = Label("//third_party/rust/remote:BUILD.ring-0.16.20.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__rustls__0_19_0",
        url = "https://crates.io/api/v1/crates/rustls/0.19.0/download",
        type = "tar.gz",
        sha256 = "064fd21ff87c6e87ed4506e68beb42459caa4a0e2eb144932e6776768556980b",
        strip_prefix = "rustls-0.19.0",
        build_file = Label("//third_party/rust/remote:BUILD.rustls-0.19.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__ryu__1_0_5",
        url = "https://crates.io/api/v1/crates/ryu/1.0.5/download",
        type = "tar.gz",
        sha256 = "71d301d4193d031abdd79ff7e3dd721168a9572ef3fe51a1517aba235bd8f86e",
        strip_prefix = "ryu-1.0.5",
        build_file = Label("//third_party/rust/remote:BUILD.ryu-1.0.5.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__same_file__1_0_6",
        url = "https://crates.io/api/v1/crates/same-file/1.0.6/download",
        type = "tar.gz",
        sha256 = "93fc1dc3aaa9bfed95e02e6eadabb4baf7e3078b0bd1b4d7b6b0b68378900502",
        strip_prefix = "same-file-1.0.6",
        build_file = Label("//third_party/rust/remote:BUILD.same-file-1.0.6.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__scopeguard__1_1_0",
        url = "https://crates.io/api/v1/crates/scopeguard/1.1.0/download",
        type = "tar.gz",
        sha256 = "d29ab0c6d3fc0ee92fe66e2d99f700eab17a8d57d1c1d3b748380fb20baa78cd",
        strip_prefix = "scopeguard-1.1.0",
        build_file = Label("//third_party/rust/remote:BUILD.scopeguard-1.1.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__sct__0_6_1",
        url = "https://crates.io/api/v1/crates/sct/0.6.1/download",
        type = "tar.gz",
        sha256 = "b362b83898e0e69f38515b82ee15aa80636befe47c3b6d3d89a911e78fc228ce",
        strip_prefix = "sct-0.6.1",
        build_file = Label("//third_party/rust/remote:BUILD.sct-0.6.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__serde__1_0_118",
        url = "https://crates.io/api/v1/crates/serde/1.0.118/download",
        type = "tar.gz",
        sha256 = "06c64263859d87aa2eb554587e2d23183398d617427327cf2b3d0ed8c69e4800",
        strip_prefix = "serde-1.0.118",
        build_file = Label("//third_party/rust/remote:BUILD.serde-1.0.118.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__serde_derive__1_0_118",
        url = "https://crates.io/api/v1/crates/serde_derive/1.0.118/download",
        type = "tar.gz",
        sha256 = "c84d3526699cd55261af4b941e4e725444df67aa4f9e6a3564f18030d12672df",
        strip_prefix = "serde_derive-1.0.118",
        build_file = Label("//third_party/rust/remote:BUILD.serde_derive-1.0.118.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__serde_json__1_0_61",
        url = "https://crates.io/api/v1/crates/serde_json/1.0.61/download",
        type = "tar.gz",
        sha256 = "4fceb2595057b6891a4ee808f70054bd2d12f0e97f1cbb78689b59f676df325a",
        strip_prefix = "serde_json-1.0.61",
        build_file = Label("//third_party/rust/remote:BUILD.serde_json-1.0.61.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__serde_urlencoded__0_7_0",
        url = "https://crates.io/api/v1/crates/serde_urlencoded/0.7.0/download",
        type = "tar.gz",
        sha256 = "edfa57a7f8d9c1d260a549e7224100f6c43d43f9103e06dd8b4095a9b2b43ce9",
        strip_prefix = "serde_urlencoded-0.7.0",
        build_file = Label("//third_party/rust/remote:BUILD.serde_urlencoded-0.7.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__slab__0_4_2",
        url = "https://crates.io/api/v1/crates/slab/0.4.2/download",
        type = "tar.gz",
        sha256 = "c111b5bd5695e56cffe5129854aa230b39c93a305372fdbb2668ca2394eea9f8",
        strip_prefix = "slab-0.4.2",
        build_file = Label("//third_party/rust/remote:BUILD.slab-0.4.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__socket2__0_3_16",
        url = "https://crates.io/api/v1/crates/socket2/0.3.16/download",
        type = "tar.gz",
        sha256 = "7fd8b795c389288baa5f355489c65e71fd48a02104600d15c4cfbc561e9e429d",
        strip_prefix = "socket2-0.3.16",
        build_file = Label("//third_party/rust/remote:BUILD.socket2-0.3.16.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__spin__0_5_2",
        url = "https://crates.io/api/v1/crates/spin/0.5.2/download",
        type = "tar.gz",
        sha256 = "6e63cff320ae2c57904679ba7cb63280a3dc4613885beafb148ee7bf9aa9042d",
        strip_prefix = "spin-0.5.2",
        build_file = Label("//third_party/rust/remote:BUILD.spin-0.5.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__strsim__0_10_0",
        url = "https://crates.io/api/v1/crates/strsim/0.10.0/download",
        type = "tar.gz",
        sha256 = "73473c0e59e6d5812c5dfe2a064a6444949f089e20eec9a2e5506596494e4623",
        strip_prefix = "strsim-0.10.0",
        build_file = Label("//third_party/rust/remote:BUILD.strsim-0.10.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__syn__1_0_48",
        url = "https://crates.io/api/v1/crates/syn/1.0.48/download",
        type = "tar.gz",
        sha256 = "cc371affeffc477f42a221a1e4297aedcea33d47d19b61455588bd9d8f6b19ac",
        strip_prefix = "syn-1.0.48",
        build_file = Label("//third_party/rust/remote:BUILD.syn-1.0.48.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tempfile__3_1_0",
        url = "https://crates.io/api/v1/crates/tempfile/3.1.0/download",
        type = "tar.gz",
        sha256 = "7a6e24d9338a0a5be79593e2fa15a648add6138caa803e2d5bc782c371732ca9",
        strip_prefix = "tempfile-3.1.0",
        build_file = Label("//third_party/rust/remote:BUILD.tempfile-3.1.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__termcolor__1_1_0",
        url = "https://crates.io/api/v1/crates/termcolor/1.1.0/download",
        type = "tar.gz",
        sha256 = "bb6bfa289a4d7c5766392812c0a1f4c1ba45afa1ad47803c11e1f407d846d75f",
        strip_prefix = "termcolor-1.1.0",
        build_file = Label("//third_party/rust/remote:BUILD.termcolor-1.1.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__textwrap__0_12_1",
        url = "https://crates.io/api/v1/crates/textwrap/0.12.1/download",
        type = "tar.gz",
        sha256 = "203008d98caf094106cfaba70acfed15e18ed3ddb7d94e49baec153a2b462789",
        strip_prefix = "textwrap-0.12.1",
        build_file = Label("//third_party/rust/remote:BUILD.textwrap-0.12.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__thiserror__1_0_22",
        url = "https://crates.io/api/v1/crates/thiserror/1.0.22/download",
        type = "tar.gz",
        sha256 = "0e9ae34b84616eedaaf1e9dd6026dbe00dcafa92aa0c8077cb69df1fcfe5e53e",
        strip_prefix = "thiserror-1.0.22",
        build_file = Label("//third_party/rust/remote:BUILD.thiserror-1.0.22.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__thiserror_impl__1_0_22",
        url = "https://crates.io/api/v1/crates/thiserror-impl/1.0.22/download",
        type = "tar.gz",
        sha256 = "9ba20f23e85b10754cd195504aebf6a27e2e6cbe28c17778a0c930724628dd56",
        strip_prefix = "thiserror-impl-1.0.22",
        build_file = Label("//third_party/rust/remote:BUILD.thiserror-impl-1.0.22.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__thread_local__1_0_1",
        url = "https://crates.io/api/v1/crates/thread_local/1.0.1/download",
        type = "tar.gz",
        sha256 = "d40c6d1b69745a6ec6fb1ca717914848da4b44ae29d9b3080cbee91d72a69b14",
        strip_prefix = "thread_local-1.0.1",
        build_file = Label("//third_party/rust/remote:BUILD.thread_local-1.0.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tinyvec__1_1_1",
        url = "https://crates.io/api/v1/crates/tinyvec/1.1.1/download",
        type = "tar.gz",
        sha256 = "317cca572a0e89c3ce0ca1f1bdc9369547fe318a683418e42ac8f59d14701023",
        strip_prefix = "tinyvec-1.1.1",
        build_file = Label("//third_party/rust/remote:BUILD.tinyvec-1.1.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tinyvec_macros__0_1_0",
        url = "https://crates.io/api/v1/crates/tinyvec_macros/0.1.0/download",
        type = "tar.gz",
        sha256 = "cda74da7e1a664f795bb1f8a87ec406fb89a02522cf6e50620d016add6dbbf5c",
        strip_prefix = "tinyvec_macros-0.1.0",
        build_file = Label("//third_party/rust/remote:BUILD.tinyvec_macros-0.1.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tokio__1_0_2",
        url = "https://crates.io/api/v1/crates/tokio/1.0.2/download",
        type = "tar.gz",
        sha256 = "0ca04cec6ff2474c638057b65798f60ac183e5e79d3448bb7163d36a39cff6ec",
        strip_prefix = "tokio-1.0.2",
        build_file = Label("//third_party/rust/remote:BUILD.tokio-1.0.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tokio_macros__1_0_0",
        url = "https://crates.io/api/v1/crates/tokio-macros/1.0.0/download",
        type = "tar.gz",
        sha256 = "42517d2975ca3114b22a16192634e8241dc5cc1f130be194645970cc1c371494",
        strip_prefix = "tokio-macros-1.0.0",
        build_file = Label("//third_party/rust/remote:BUILD.tokio-macros-1.0.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tokio_rustls__0_22_0",
        url = "https://crates.io/api/v1/crates/tokio-rustls/0.22.0/download",
        type = "tar.gz",
        sha256 = "bc6844de72e57df1980054b38be3a9f4702aba4858be64dd700181a8a6d0e1b6",
        strip_prefix = "tokio-rustls-0.22.0",
        build_file = Label("//third_party/rust/remote:BUILD.tokio-rustls-0.22.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tokio_stream__0_1_2",
        url = "https://crates.io/api/v1/crates/tokio-stream/0.1.2/download",
        type = "tar.gz",
        sha256 = "76066865172052eb8796c686f0b441a93df8b08d40a950b062ffb9a426f00edd",
        strip_prefix = "tokio-stream-0.1.2",
        build_file = Label("//third_party/rust/remote:BUILD.tokio-stream-0.1.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tokio_util__0_6_6",
        url = "https://crates.io/api/v1/crates/tokio-util/0.6.6/download",
        type = "tar.gz",
        sha256 = "940a12c99365c31ea8dd9ba04ec1be183ffe4920102bb7122c2f515437601e8e",
        strip_prefix = "tokio-util-0.6.6",
        build_file = Label("//third_party/rust/remote:BUILD.tokio-util-0.6.6.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tonic__0_4_2",
        url = "https://crates.io/api/v1/crates/tonic/0.4.2/download",
        type = "tar.gz",
        sha256 = "556dc31b450f45d18279cfc3d2519280273f460d5387e6b7b24503e65d206f8b",
        strip_prefix = "tonic-0.4.2",
        build_file = Label("//third_party/rust/remote:BUILD.tonic-0.4.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tonic_build__0_4_2",
        url = "https://crates.io/api/v1/crates/tonic-build/0.4.2/download",
        type = "tar.gz",
        sha256 = "c695de27302f4697191dda1c7178131a8cb805463dda02864acb80fe1322fdcf",
        strip_prefix = "tonic-build-0.4.2",
        build_file = Label("//third_party/rust/remote:BUILD.tonic-build-0.4.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tonic_reflection__0_1_0",
        url = "https://crates.io/api/v1/crates/tonic-reflection/0.1.0/download",
        type = "tar.gz",
        sha256 = "56498d20188550337ea6c48ecf59d11646382dbfcd61051fb98c1093cfae3c21",
        strip_prefix = "tonic-reflection-0.1.0",
        build_file = Label("//third_party/rust/remote:BUILD.tonic-reflection-0.1.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tower__0_4_6",
        url = "https://crates.io/api/v1/crates/tower/0.4.6/download",
        type = "tar.gz",
        sha256 = "f715efe02c0862926eb463e49368d38ddb119383475686178e32e26d15d06a66",
        strip_prefix = "tower-0.4.6",
        build_file = Label("//third_party/rust/remote:BUILD.tower-0.4.6.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tower_layer__0_3_1",
        url = "https://crates.io/api/v1/crates/tower-layer/0.3.1/download",
        type = "tar.gz",
        sha256 = "343bc9466d3fe6b0f960ef45960509f84480bf4fd96f92901afe7ff3df9d3a62",
        strip_prefix = "tower-layer-0.3.1",
        build_file = Label("//third_party/rust/remote:BUILD.tower-layer-0.3.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tower_service__0_3_0",
        url = "https://crates.io/api/v1/crates/tower-service/0.3.0/download",
        type = "tar.gz",
        sha256 = "e987b6bf443f4b5b3b6f38704195592cca41c5bb7aedd3c3693c7081f8289860",
        strip_prefix = "tower-service-0.3.0",
        build_file = Label("//third_party/rust/remote:BUILD.tower-service-0.3.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tracing__0_1_21",
        url = "https://crates.io/api/v1/crates/tracing/0.1.21/download",
        type = "tar.gz",
        sha256 = "b0987850db3733619253fe60e17cb59b82d37c7e6c0236bb81e4d6b87c879f27",
        strip_prefix = "tracing-0.1.21",
        build_file = Label("//third_party/rust/remote:BUILD.tracing-0.1.21.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tracing_attributes__0_1_11",
        url = "https://crates.io/api/v1/crates/tracing-attributes/0.1.11/download",
        type = "tar.gz",
        sha256 = "80e0ccfc3378da0cce270c946b676a376943f5cd16aeba64568e7939806f4ada",
        strip_prefix = "tracing-attributes-0.1.11",
        build_file = Label("//third_party/rust/remote:BUILD.tracing-attributes-0.1.11.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tracing_core__0_1_17",
        url = "https://crates.io/api/v1/crates/tracing-core/0.1.17/download",
        type = "tar.gz",
        sha256 = "f50de3927f93d202783f4513cda820ab47ef17f624b03c096e86ef00c67e6b5f",
        strip_prefix = "tracing-core-0.1.17",
        build_file = Label("//third_party/rust/remote:BUILD.tracing-core-0.1.17.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tracing_futures__0_2_4",
        url = "https://crates.io/api/v1/crates/tracing-futures/0.2.4/download",
        type = "tar.gz",
        sha256 = "ab7bb6f14721aa00656086e9335d363c5c8747bae02ebe32ea2c7dece5689b4c",
        strip_prefix = "tracing-futures-0.2.4",
        build_file = Label("//third_party/rust/remote:BUILD.tracing-futures-0.2.4.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__try_lock__0_2_3",
        url = "https://crates.io/api/v1/crates/try-lock/0.2.3/download",
        type = "tar.gz",
        sha256 = "59547bce71d9c38b83d9c0e92b6066c4253371f15005def0c30d9657f50c7642",
        strip_prefix = "try-lock-0.2.3",
        build_file = Label("//third_party/rust/remote:BUILD.try-lock-0.2.3.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__unicode_bidi__0_3_4",
        url = "https://crates.io/api/v1/crates/unicode-bidi/0.3.4/download",
        type = "tar.gz",
        sha256 = "49f2bd0c6468a8230e1db229cff8029217cf623c767ea5d60bfbd42729ea54d5",
        strip_prefix = "unicode-bidi-0.3.4",
        build_file = Label("//third_party/rust/remote:BUILD.unicode-bidi-0.3.4.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__unicode_normalization__0_1_16",
        url = "https://crates.io/api/v1/crates/unicode-normalization/0.1.16/download",
        type = "tar.gz",
        sha256 = "a13e63ab62dbe32aeee58d1c5408d35c36c392bba5d9d3142287219721afe606",
        strip_prefix = "unicode-normalization-0.1.16",
        build_file = Label("//third_party/rust/remote:BUILD.unicode-normalization-0.1.16.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__unicode_segmentation__1_6_0",
        url = "https://crates.io/api/v1/crates/unicode-segmentation/1.6.0/download",
        type = "tar.gz",
        sha256 = "e83e153d1053cbb5a118eeff7fd5be06ed99153f00dbcd8ae310c5fb2b22edc0",
        strip_prefix = "unicode-segmentation-1.6.0",
        build_file = Label("//third_party/rust/remote:BUILD.unicode-segmentation-1.6.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__unicode_width__0_1_8",
        url = "https://crates.io/api/v1/crates/unicode-width/0.1.8/download",
        type = "tar.gz",
        sha256 = "9337591893a19b88d8d87f2cec1e73fad5cdfd10e5a6f349f498ad6ea2ffb1e3",
        strip_prefix = "unicode-width-0.1.8",
        build_file = Label("//third_party/rust/remote:BUILD.unicode-width-0.1.8.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__unicode_xid__0_2_1",
        url = "https://crates.io/api/v1/crates/unicode-xid/0.2.1/download",
        type = "tar.gz",
        sha256 = "f7fe0bb3479651439c9112f72b6c505038574c9fbb575ed1bf3b797fa39dd564",
        strip_prefix = "unicode-xid-0.2.1",
        build_file = Label("//third_party/rust/remote:BUILD.unicode-xid-0.2.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__untrusted__0_7_1",
        url = "https://crates.io/api/v1/crates/untrusted/0.7.1/download",
        type = "tar.gz",
        sha256 = "a156c684c91ea7d62626509bce3cb4e1d9ed5c4d978f7b4352658f96a4c26b4a",
        strip_prefix = "untrusted-0.7.1",
        build_file = Label("//third_party/rust/remote:BUILD.untrusted-0.7.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__url__2_2_0",
        url = "https://crates.io/api/v1/crates/url/2.2.0/download",
        type = "tar.gz",
        sha256 = "5909f2b0817350449ed73e8bcd81c8c3c8d9a7a5d8acba4b27db277f1868976e",
        strip_prefix = "url-2.2.0",
        build_file = Label("//third_party/rust/remote:BUILD.url-2.2.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__vec_map__0_8_2",
        url = "https://crates.io/api/v1/crates/vec_map/0.8.2/download",
        type = "tar.gz",
        sha256 = "f1bddf1187be692e79c5ffeab891132dfb0f236ed36a43c7ed39f1165ee20191",
        strip_prefix = "vec_map-0.8.2",
        build_file = Label("//third_party/rust/remote:BUILD.vec_map-0.8.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__version_check__0_9_2",
        url = "https://crates.io/api/v1/crates/version_check/0.9.2/download",
        type = "tar.gz",
        sha256 = "b5a972e5669d67ba988ce3dc826706fb0a8b01471c088cb0b6110b805cc36aed",
        strip_prefix = "version_check-0.9.2",
        build_file = Label("//third_party/rust/remote:BUILD.version_check-0.9.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__walkdir__2_3_1",
        url = "https://crates.io/api/v1/crates/walkdir/2.3.1/download",
        type = "tar.gz",
        sha256 = "777182bc735b6424e1a57516d35ed72cb8019d85c8c9bf536dccb3445c1a2f7d",
        strip_prefix = "walkdir-2.3.1",
        build_file = Label("//third_party/rust/remote:BUILD.walkdir-2.3.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__want__0_3_0",
        url = "https://crates.io/api/v1/crates/want/0.3.0/download",
        type = "tar.gz",
        sha256 = "1ce8a968cb1cd110d136ff8b819a556d6fb6d919363c61534f6860c7eb172ba0",
        strip_prefix = "want-0.3.0",
        build_file = Label("//third_party/rust/remote:BUILD.want-0.3.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__wasi__0_10_1_wasi_snapshot_preview1",
        url = "https://crates.io/api/v1/crates/wasi/0.10.1+wasi-snapshot-preview1/download",
        type = "tar.gz",
        sha256 = "93c6c3420963c5c64bca373b25e77acb562081b9bb4dd5bb864187742186cea9",
        strip_prefix = "wasi-0.10.1+wasi-snapshot-preview1",
        build_file = Label("//third_party/rust/remote:BUILD.wasi-0.10.1+wasi-snapshot-preview1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__wasi__0_9_0_wasi_snapshot_preview1",
        url = "https://crates.io/api/v1/crates/wasi/0.9.0+wasi-snapshot-preview1/download",
        type = "tar.gz",
        sha256 = "cccddf32554fecc6acb585f82a32a72e28b48f8c4c1883ddfeeeaa96f7d8e519",
        strip_prefix = "wasi-0.9.0+wasi-snapshot-preview1",
        build_file = Label("//third_party/rust/remote:BUILD.wasi-0.9.0+wasi-snapshot-preview1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__wasm_bindgen__0_2_70",
        url = "https://crates.io/api/v1/crates/wasm-bindgen/0.2.70/download",
        type = "tar.gz",
        sha256 = "55c0f7123de74f0dab9b7d00fd614e7b19349cd1e2f5252bbe9b1754b59433be",
        strip_prefix = "wasm-bindgen-0.2.70",
        build_file = Label("//third_party/rust/remote:BUILD.wasm-bindgen-0.2.70.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__wasm_bindgen_backend__0_2_70",
        url = "https://crates.io/api/v1/crates/wasm-bindgen-backend/0.2.70/download",
        type = "tar.gz",
        sha256 = "7bc45447f0d4573f3d65720f636bbcc3dd6ce920ed704670118650bcd47764c7",
        strip_prefix = "wasm-bindgen-backend-0.2.70",
        build_file = Label("//third_party/rust/remote:BUILD.wasm-bindgen-backend-0.2.70.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__wasm_bindgen_futures__0_4_20",
        url = "https://crates.io/api/v1/crates/wasm-bindgen-futures/0.4.20/download",
        type = "tar.gz",
        sha256 = "3de431a2910c86679c34283a33f66f4e4abd7e0aec27b6669060148872aadf94",
        strip_prefix = "wasm-bindgen-futures-0.4.20",
        build_file = Label("//third_party/rust/remote:BUILD.wasm-bindgen-futures-0.4.20.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__wasm_bindgen_macro__0_2_70",
        url = "https://crates.io/api/v1/crates/wasm-bindgen-macro/0.2.70/download",
        type = "tar.gz",
        sha256 = "3b8853882eef39593ad4174dd26fc9865a64e84026d223f63bb2c42affcbba2c",
        strip_prefix = "wasm-bindgen-macro-0.2.70",
        build_file = Label("//third_party/rust/remote:BUILD.wasm-bindgen-macro-0.2.70.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__wasm_bindgen_macro_support__0_2_70",
        url = "https://crates.io/api/v1/crates/wasm-bindgen-macro-support/0.2.70/download",
        type = "tar.gz",
        sha256 = "4133b5e7f2a531fa413b3a1695e925038a05a71cf67e87dafa295cb645a01385",
        strip_prefix = "wasm-bindgen-macro-support-0.2.70",
        build_file = Label("//third_party/rust/remote:BUILD.wasm-bindgen-macro-support-0.2.70.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__wasm_bindgen_shared__0_2_70",
        url = "https://crates.io/api/v1/crates/wasm-bindgen-shared/0.2.70/download",
        type = "tar.gz",
        sha256 = "dd4945e4943ae02d15c13962b38a5b1e81eadd4b71214eee75af64a4d6a4fd64",
        strip_prefix = "wasm-bindgen-shared-0.2.70",
        build_file = Label("//third_party/rust/remote:BUILD.wasm-bindgen-shared-0.2.70.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__web_sys__0_3_47",
        url = "https://crates.io/api/v1/crates/web-sys/0.3.47/download",
        type = "tar.gz",
        sha256 = "c40dc691fc48003eba817c38da7113c15698142da971298003cac3ef175680b3",
        strip_prefix = "web-sys-0.3.47",
        build_file = Label("//third_party/rust/remote:BUILD.web-sys-0.3.47.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__webpki__0_21_4",
        url = "https://crates.io/api/v1/crates/webpki/0.21.4/download",
        type = "tar.gz",
        sha256 = "b8e38c0608262c46d4a56202ebabdeb094cef7e560ca7a226c6bf055188aa4ea",
        strip_prefix = "webpki-0.21.4",
        build_file = Label("//third_party/rust/remote:BUILD.webpki-0.21.4.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__webpki_roots__0_21_1",
        url = "https://crates.io/api/v1/crates/webpki-roots/0.21.1/download",
        type = "tar.gz",
        sha256 = "aabe153544e473b775453675851ecc86863d2a81d786d741f6b76778f2a48940",
        strip_prefix = "webpki-roots-0.21.1",
        build_file = Label("//third_party/rust/remote:BUILD.webpki-roots-0.21.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__which__4_0_2",
        url = "https://crates.io/api/v1/crates/which/4.0.2/download",
        type = "tar.gz",
        sha256 = "87c14ef7e1b8b8ecfc75d5eca37949410046e66f15d185c01d70824f1f8111ef",
        strip_prefix = "which-4.0.2",
        build_file = Label("//third_party/rust/remote:BUILD.which-4.0.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__winapi__0_3_9",
        url = "https://crates.io/api/v1/crates/winapi/0.3.9/download",
        type = "tar.gz",
        sha256 = "5c839a674fcd7a98952e593242ea400abe93992746761e38641405d28b00f419",
        strip_prefix = "winapi-0.3.9",
        build_file = Label("//third_party/rust/remote:BUILD.winapi-0.3.9.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__winapi_i686_pc_windows_gnu__0_4_0",
        url = "https://crates.io/api/v1/crates/winapi-i686-pc-windows-gnu/0.4.0/download",
        type = "tar.gz",
        sha256 = "ac3b87c63620426dd9b991e5ce0329eff545bccbbb34f3be09ff6fb6ab51b7b6",
        strip_prefix = "winapi-i686-pc-windows-gnu-0.4.0",
        build_file = Label("//third_party/rust/remote:BUILD.winapi-i686-pc-windows-gnu-0.4.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__winapi_util__0_1_5",
        url = "https://crates.io/api/v1/crates/winapi-util/0.1.5/download",
        type = "tar.gz",
        sha256 = "70ec6ce85bb158151cae5e5c87f95a8e97d2c0c4b001223f33a334e3ce5de178",
        strip_prefix = "winapi-util-0.1.5",
        build_file = Label("//third_party/rust/remote:BUILD.winapi-util-0.1.5.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__winapi_x86_64_pc_windows_gnu__0_4_0",
        url = "https://crates.io/api/v1/crates/winapi-x86_64-pc-windows-gnu/0.4.0/download",
        type = "tar.gz",
        sha256 = "712e227841d057c1ee1cd2fb22fa7e5a5461ae8e48fa2ca79ec42cfc1931183f",
        strip_prefix = "winapi-x86_64-pc-windows-gnu-0.4.0",
        build_file = Label("//third_party/rust/remote:BUILD.winapi-x86_64-pc-windows-gnu-0.4.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__winreg__0_7_0",
        url = "https://crates.io/api/v1/crates/winreg/0.7.0/download",
        type = "tar.gz",
        sha256 = "0120db82e8a1e0b9fb3345a539c478767c0048d842860994d96113d5b667bd69",
        strip_prefix = "winreg-0.7.0",
        build_file = Label("//third_party/rust/remote:BUILD.winreg-0.7.0.bazel"),
    )
