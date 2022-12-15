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
        name = "raze__aho_corasick__0_7_19",
        url = "https://crates.io/api/v1/crates/aho-corasick/0.7.19/download",
        type = "tar.gz",
        sha256 = "b4f55bd91a0978cbfd91c457a164bab8b4001c833b7f323132c0a4e1922dd44e",
        strip_prefix = "aho-corasick-0.7.19",
        build_file = Label("//third_party/rust/remote:BUILD.aho-corasick-0.7.19.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__anyhow__1_0_66",
        url = "https://crates.io/api/v1/crates/anyhow/1.0.66/download",
        type = "tar.gz",
        sha256 = "216261ddc8289130e551ddcd5ce8a064710c0d064a4d2895c67151c92b5443f6",
        strip_prefix = "anyhow-1.0.66",
        build_file = Label("//third_party/rust/remote:BUILD.anyhow-1.0.66.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__async_stream__0_3_3",
        url = "https://crates.io/api/v1/crates/async-stream/0.3.3/download",
        type = "tar.gz",
        sha256 = "dad5c83079eae9969be7fadefe640a1c566901f05ff91ab221de4b6f68d9507e",
        strip_prefix = "async-stream-0.3.3",
        build_file = Label("//third_party/rust/remote:BUILD.async-stream-0.3.3.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__async_stream_impl__0_3_3",
        url = "https://crates.io/api/v1/crates/async-stream-impl/0.3.3/download",
        type = "tar.gz",
        sha256 = "10f203db73a71dfa2fb6dd22763990fa26f3d2625a6da2da900d23b87d26be27",
        strip_prefix = "async-stream-impl-0.3.3",
        build_file = Label("//third_party/rust/remote:BUILD.async-stream-impl-0.3.3.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__async_trait__0_1_58",
        url = "https://crates.io/api/v1/crates/async-trait/0.1.58/download",
        type = "tar.gz",
        sha256 = "1e805d94e6b5001b651426cf4cd446b1ab5f319d27bab5c644f61de0a804360c",
        strip_prefix = "async-trait-0.1.58",
        build_file = Label("//third_party/rust/remote:BUILD.async-trait-0.1.58.bazel"),
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
        name = "raze__autocfg__1_1_0",
        url = "https://crates.io/api/v1/crates/autocfg/1.1.0/download",
        type = "tar.gz",
        sha256 = "d468802bab17cbc0cc575e9b053f41e72aa36bfa6b7f55e3529ffa43161b97fa",
        strip_prefix = "autocfg-1.1.0",
        build_file = Label("//third_party/rust/remote:BUILD.autocfg-1.1.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__base64__0_13_1",
        url = "https://crates.io/api/v1/crates/base64/0.13.1/download",
        type = "tar.gz",
        sha256 = "9e1b586273c5702936fe7b7d6896644d8be71e6314cfe09d3167c95f712589e8",
        strip_prefix = "base64-0.13.1",
        build_file = Label("//third_party/rust/remote:BUILD.base64-0.13.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__bitflags__1_3_2",
        url = "https://crates.io/api/v1/crates/bitflags/1.3.2/download",
        type = "tar.gz",
        sha256 = "bef38d45163c2f1dde094a7dfd33ccf595c92905c8f8f4fdc18d06fb1037718a",
        strip_prefix = "bitflags-1.3.2",
        build_file = Label("//third_party/rust/remote:BUILD.bitflags-1.3.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__build_const__0_2_2",
        url = "https://crates.io/api/v1/crates/build_const/0.2.2/download",
        type = "tar.gz",
        sha256 = "b4ae4235e6dac0694637c763029ecea1a2ec9e4e06ec2729bd21ba4d9c863eb7",
        strip_prefix = "build_const-0.2.2",
        build_file = Label("//third_party/rust/remote:BUILD.build_const-0.2.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__bumpalo__3_11_1",
        url = "https://crates.io/api/v1/crates/bumpalo/3.11.1/download",
        type = "tar.gz",
        sha256 = "572f695136211188308f16ad2ca5c851a712c464060ae6974944458eb83880ba",
        strip_prefix = "bumpalo-3.11.1",
        build_file = Label("//third_party/rust/remote:BUILD.bumpalo-3.11.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__byteorder__1_4_3",
        url = "https://crates.io/api/v1/crates/byteorder/1.4.3/download",
        type = "tar.gz",
        sha256 = "14c189c53d098945499cdfa7ecc63567cf3886b3332b312a5b4585d8d3a6a610",
        strip_prefix = "byteorder-1.4.3",
        build_file = Label("//third_party/rust/remote:BUILD.byteorder-1.4.3.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__bytes__1_2_1",
        url = "https://crates.io/api/v1/crates/bytes/1.2.1/download",
        type = "tar.gz",
        sha256 = "ec8a7b6a70fde80372154c65702f00a0f56f3e1c36abbc6c440484be248856db",
        strip_prefix = "bytes-1.2.1",
        build_file = Label("//third_party/rust/remote:BUILD.bytes-1.2.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__cc__1_0_74",
        url = "https://crates.io/api/v1/crates/cc/1.0.74/download",
        type = "tar.gz",
        sha256 = "581f5dba903aac52ea3feb5ec4810848460ee833876f1f9b0fdeab1f19091574",
        strip_prefix = "cc-1.0.74",
        build_file = Label("//third_party/rust/remote:BUILD.cc-1.0.74.bazel"),
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
        name = "raze__clap__3_2_23",
        url = "https://crates.io/api/v1/crates/clap/3.2.23/download",
        type = "tar.gz",
        sha256 = "71655c45cb9845d3270c9d6df84ebe72b4dad3c2ba3f7023ad47c144e4e473a5",
        strip_prefix = "clap-3.2.23",
        build_file = Label("//third_party/rust/remote:BUILD.clap-3.2.23.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__clap_derive__3_2_18",
        url = "https://crates.io/api/v1/crates/clap_derive/3.2.18/download",
        type = "tar.gz",
        sha256 = "ea0c8bce528c4be4da13ea6fead8965e95b6073585a2f05204bd8f4119f82a65",
        strip_prefix = "clap_derive-3.2.18",
        build_file = Label("//third_party/rust/remote:BUILD.clap_derive-3.2.18.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__clap_lex__0_2_4",
        url = "https://crates.io/api/v1/crates/clap_lex/0.2.4/download",
        type = "tar.gz",
        sha256 = "2850f2f5a82cbf437dd5af4d49848fbdfc27c157c3d010345776f952765261c5",
        strip_prefix = "clap_lex-0.2.4",
        build_file = Label("//third_party/rust/remote:BUILD.clap_lex-0.2.4.bazel"),
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
        name = "raze__crossbeam__0_8_2",
        url = "https://crates.io/api/v1/crates/crossbeam/0.8.2/download",
        type = "tar.gz",
        sha256 = "2801af0d36612ae591caa9568261fddce32ce6e08a7275ea334a06a4ad021a2c",
        strip_prefix = "crossbeam-0.8.2",
        build_file = Label("//third_party/rust/remote:BUILD.crossbeam-0.8.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__crossbeam_channel__0_5_6",
        url = "https://crates.io/api/v1/crates/crossbeam-channel/0.5.6/download",
        type = "tar.gz",
        sha256 = "c2dd04ddaf88237dc3b8d8f9a3c1004b506b54b3313403944054d23c0870c521",
        strip_prefix = "crossbeam-channel-0.5.6",
        build_file = Label("//third_party/rust/remote:BUILD.crossbeam-channel-0.5.6.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__crossbeam_deque__0_8_2",
        url = "https://crates.io/api/v1/crates/crossbeam-deque/0.8.2/download",
        type = "tar.gz",
        sha256 = "715e8152b692bba2d374b53d4875445368fdf21a94751410af607a5ac677d1fc",
        strip_prefix = "crossbeam-deque-0.8.2",
        build_file = Label("//third_party/rust/remote:BUILD.crossbeam-deque-0.8.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__crossbeam_epoch__0_9_11",
        url = "https://crates.io/api/v1/crates/crossbeam-epoch/0.9.11/download",
        type = "tar.gz",
        sha256 = "f916dfc5d356b0ed9dae65f1db9fc9770aa2851d2662b988ccf4fe3516e86348",
        strip_prefix = "crossbeam-epoch-0.9.11",
        build_file = Label("//third_party/rust/remote:BUILD.crossbeam-epoch-0.9.11.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__crossbeam_queue__0_3_6",
        url = "https://crates.io/api/v1/crates/crossbeam-queue/0.3.6/download",
        type = "tar.gz",
        sha256 = "1cd42583b04998a5363558e5f9291ee5a5ff6b49944332103f251e7479a82aa7",
        strip_prefix = "crossbeam-queue-0.3.6",
        build_file = Label("//third_party/rust/remote:BUILD.crossbeam-queue-0.3.6.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__crossbeam_utils__0_8_12",
        url = "https://crates.io/api/v1/crates/crossbeam-utils/0.8.12/download",
        type = "tar.gz",
        sha256 = "edbafec5fa1f196ca66527c1b12c2ec4745ca14b50f1ad8f9f6f720b55d11fac",
        strip_prefix = "crossbeam-utils-0.8.12",
        build_file = Label("//third_party/rust/remote:BUILD.crossbeam-utils-0.8.12.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__either__1_8_0",
        url = "https://crates.io/api/v1/crates/either/1.8.0/download",
        type = "tar.gz",
        sha256 = "90e5c1c8368803113bf0c9584fc495a58b86dc8a29edbf8fe877d21d9507e797",
        strip_prefix = "either-1.8.0",
        build_file = Label("//third_party/rust/remote:BUILD.either-1.8.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__encoding_rs__0_8_31",
        url = "https://crates.io/api/v1/crates/encoding_rs/0.8.31/download",
        type = "tar.gz",
        sha256 = "9852635589dc9f9ea1b6fe9f05b50ef208c85c834a562f0c6abb1c475736ec2b",
        strip_prefix = "encoding_rs-0.8.31",
        build_file = Label("//third_party/rust/remote:BUILD.encoding_rs-0.8.31.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__env_logger__0_8_4",
        url = "https://crates.io/api/v1/crates/env_logger/0.8.4/download",
        type = "tar.gz",
        sha256 = "a19187fea3ac7e84da7dacf48de0c45d63c6a76f9490dae389aead16c243fce3",
        strip_prefix = "env_logger-0.8.4",
        build_file = Label("//third_party/rust/remote:BUILD.env_logger-0.8.4.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__fastrand__1_8_0",
        url = "https://crates.io/api/v1/crates/fastrand/1.8.0/download",
        type = "tar.gz",
        sha256 = "a7a407cfaa3385c4ae6b23e84623d48c2798d06e3e6a1878f7f59f17b3f86499",
        strip_prefix = "fastrand-1.8.0",
        build_file = Label("//third_party/rust/remote:BUILD.fastrand-1.8.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__fixedbitset__0_4_2",
        url = "https://crates.io/api/v1/crates/fixedbitset/0.4.2/download",
        type = "tar.gz",
        sha256 = "0ce7134b9999ecaf8bcd65542e436736ef32ddca1b3e06094cb6ec5755203b80",
        strip_prefix = "fixedbitset-0.4.2",
        build_file = Label("//third_party/rust/remote:BUILD.fixedbitset-0.4.2.bazel"),
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
        name = "raze__form_urlencoded__1_1_0",
        url = "https://crates.io/api/v1/crates/form_urlencoded/1.1.0/download",
        type = "tar.gz",
        sha256 = "a9c384f161156f5260c24a097c56119f9be8c798586aecc13afbcbe7b7e26bf8",
        strip_prefix = "form_urlencoded-1.1.0",
        build_file = Label("//third_party/rust/remote:BUILD.form_urlencoded-1.1.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__futures_channel__0_3_25",
        url = "https://crates.io/api/v1/crates/futures-channel/0.3.25/download",
        type = "tar.gz",
        sha256 = "52ba265a92256105f45b719605a571ffe2d1f0fea3807304b522c1d778f79eed",
        strip_prefix = "futures-channel-0.3.25",
        build_file = Label("//third_party/rust/remote:BUILD.futures-channel-0.3.25.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__futures_core__0_3_25",
        url = "https://crates.io/api/v1/crates/futures-core/0.3.25/download",
        type = "tar.gz",
        sha256 = "04909a7a7e4633ae6c4a9ab280aeb86da1236243a77b694a49eacd659a4bd3ac",
        strip_prefix = "futures-core-0.3.25",
        build_file = Label("//third_party/rust/remote:BUILD.futures-core-0.3.25.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__futures_io__0_3_25",
        url = "https://crates.io/api/v1/crates/futures-io/0.3.25/download",
        type = "tar.gz",
        sha256 = "00f5fb52a06bdcadeb54e8d3671f8888a39697dcb0b81b23b55174030427f4eb",
        strip_prefix = "futures-io-0.3.25",
        build_file = Label("//third_party/rust/remote:BUILD.futures-io-0.3.25.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__futures_sink__0_3_25",
        url = "https://crates.io/api/v1/crates/futures-sink/0.3.25/download",
        type = "tar.gz",
        sha256 = "39c15cf1a4aa79df40f1bb462fb39676d0ad9e366c2a33b590d7c66f4f81fcf9",
        strip_prefix = "futures-sink-0.3.25",
        build_file = Label("//third_party/rust/remote:BUILD.futures-sink-0.3.25.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__futures_task__0_3_25",
        url = "https://crates.io/api/v1/crates/futures-task/0.3.25/download",
        type = "tar.gz",
        sha256 = "2ffb393ac5d9a6eaa9d3fdf37ae2776656b706e200c8e16b1bdb227f5198e6ea",
        strip_prefix = "futures-task-0.3.25",
        build_file = Label("//third_party/rust/remote:BUILD.futures-task-0.3.25.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__futures_util__0_3_25",
        url = "https://crates.io/api/v1/crates/futures-util/0.3.25/download",
        type = "tar.gz",
        sha256 = "197676987abd2f9cadff84926f410af1c183608d36641465df73ae8211dc65d6",
        strip_prefix = "futures-util-0.3.25",
        build_file = Label("//third_party/rust/remote:BUILD.futures-util-0.3.25.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__getrandom__0_1_16",
        url = "https://crates.io/api/v1/crates/getrandom/0.1.16/download",
        type = "tar.gz",
        sha256 = "8fc3cb4d91f53b50155bdcfd23f6a4c39ae1969c2ae85982b135750cccaf5fce",
        strip_prefix = "getrandom-0.1.16",
        build_file = Label("//third_party/rust/remote:BUILD.getrandom-0.1.16.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__getrandom__0_2_8",
        url = "https://crates.io/api/v1/crates/getrandom/0.2.8/download",
        type = "tar.gz",
        sha256 = "c05aeb6a22b8f62540c194aac980f2115af067bfe15a0734d7277a768d396b31",
        strip_prefix = "getrandom-0.2.8",
        build_file = Label("//third_party/rust/remote:BUILD.getrandom-0.2.8.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__h2__0_3_15",
        url = "https://crates.io/api/v1/crates/h2/0.3.15/download",
        type = "tar.gz",
        sha256 = "5f9f29bc9dda355256b2916cf526ab02ce0aeaaaf2bad60d65ef3f12f11dd0f4",
        strip_prefix = "h2-0.3.15",
        build_file = Label("//third_party/rust/remote:BUILD.h2-0.3.15.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__hashbrown__0_12_3",
        url = "https://crates.io/api/v1/crates/hashbrown/0.12.3/download",
        type = "tar.gz",
        sha256 = "8a9ee70c43aaf417c914396645a0fa852624801b24ebb7ae78fe8272889ac888",
        strip_prefix = "hashbrown-0.12.3",
        build_file = Label("//third_party/rust/remote:BUILD.hashbrown-0.12.3.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__heck__0_3_3",
        url = "https://crates.io/api/v1/crates/heck/0.3.3/download",
        type = "tar.gz",
        sha256 = "6d621efb26863f0e9924c6ac577e8275e5e6b77455db64ffa6c65c904e9e132c",
        strip_prefix = "heck-0.3.3",
        build_file = Label("//third_party/rust/remote:BUILD.heck-0.3.3.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__heck__0_4_0",
        url = "https://crates.io/api/v1/crates/heck/0.4.0/download",
        type = "tar.gz",
        sha256 = "2540771e65fc8cb83cd6e8a237f70c319bd5c29f78ed1084ba5d50eeac86f7f9",
        strip_prefix = "heck-0.4.0",
        build_file = Label("//third_party/rust/remote:BUILD.heck-0.4.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__hermit_abi__0_1_19",
        url = "https://crates.io/api/v1/crates/hermit-abi/0.1.19/download",
        type = "tar.gz",
        sha256 = "62b467343b94ba476dcb2500d242dadbb39557df889310ac77c5d99100aaac33",
        strip_prefix = "hermit-abi-0.1.19",
        build_file = Label("//third_party/rust/remote:BUILD.hermit-abi-0.1.19.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__http__0_2_8",
        url = "https://crates.io/api/v1/crates/http/0.2.8/download",
        type = "tar.gz",
        sha256 = "75f43d41e26995c17e71ee126451dd3941010b0514a81a9d11f3b341debc2399",
        strip_prefix = "http-0.2.8",
        build_file = Label("//third_party/rust/remote:BUILD.http-0.2.8.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__http_body__0_4_5",
        url = "https://crates.io/api/v1/crates/http-body/0.4.5/download",
        type = "tar.gz",
        sha256 = "d5f38f16d184e36f2408a55281cd658ecbd3ca05cce6d6510a176eca393e26d1",
        strip_prefix = "http-body-0.4.5",
        build_file = Label("//third_party/rust/remote:BUILD.http-body-0.4.5.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__httparse__1_8_0",
        url = "https://crates.io/api/v1/crates/httparse/1.8.0/download",
        type = "tar.gz",
        sha256 = "d897f394bad6a705d5f4104762e116a75639e470d80901eed05a860a95cb1904",
        strip_prefix = "httparse-1.8.0",
        build_file = Label("//third_party/rust/remote:BUILD.httparse-1.8.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__httpdate__1_0_2",
        url = "https://crates.io/api/v1/crates/httpdate/1.0.2/download",
        type = "tar.gz",
        sha256 = "c4a1e36c821dbe04574f602848a19f742f4fb3c98d40449f11bcad18d6b17421",
        strip_prefix = "httpdate-1.0.2",
        build_file = Label("//third_party/rust/remote:BUILD.httpdate-1.0.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__humantime__2_1_0",
        url = "https://crates.io/api/v1/crates/humantime/2.1.0/download",
        type = "tar.gz",
        sha256 = "9a3a5bfb195931eeb336b2a7b4d761daec841b97f947d34394601737a7bba5e4",
        strip_prefix = "humantime-2.1.0",
        build_file = Label("//third_party/rust/remote:BUILD.humantime-2.1.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__hyper__0_14_22",
        url = "https://crates.io/api/v1/crates/hyper/0.14.22/download",
        type = "tar.gz",
        sha256 = "abfba89e19b959ca163c7752ba59d737c1ceea53a5d31a149c805446fc958064",
        strip_prefix = "hyper-0.14.22",
        build_file = Label("//third_party/rust/remote:BUILD.hyper-0.14.22.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__hyper_rustls__0_23_0",
        url = "https://crates.io/api/v1/crates/hyper-rustls/0.23.0/download",
        type = "tar.gz",
        sha256 = "d87c48c02e0dc5e3b849a2041db3029fd066650f8f717c07bf8ed78ccb895cac",
        strip_prefix = "hyper-rustls-0.23.0",
        build_file = Label("//third_party/rust/remote:BUILD.hyper-rustls-0.23.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__hyper_timeout__0_4_1",
        url = "https://crates.io/api/v1/crates/hyper-timeout/0.4.1/download",
        type = "tar.gz",
        sha256 = "bbb958482e8c7be4bc3cf272a766a2b0bf1a6755e7a6ae777f017a31d11b13b1",
        strip_prefix = "hyper-timeout-0.4.1",
        build_file = Label("//third_party/rust/remote:BUILD.hyper-timeout-0.4.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__idna__0_3_0",
        url = "https://crates.io/api/v1/crates/idna/0.3.0/download",
        type = "tar.gz",
        sha256 = "e14ddfc70884202db2244c223200c204c2bda1bc6e0998d11b5e024d657209e6",
        strip_prefix = "idna-0.3.0",
        build_file = Label("//third_party/rust/remote:BUILD.idna-0.3.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__indexmap__1_9_1",
        url = "https://crates.io/api/v1/crates/indexmap/1.9.1/download",
        type = "tar.gz",
        sha256 = "10a35a97730320ffe8e2d410b5d3b69279b98d2c14bdb8b70ea89ecf7888d41e",
        strip_prefix = "indexmap-1.9.1",
        build_file = Label("//third_party/rust/remote:BUILD.indexmap-1.9.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__instant__0_1_12",
        url = "https://crates.io/api/v1/crates/instant/0.1.12/download",
        type = "tar.gz",
        sha256 = "7a5bbe824c507c5da5956355e86a746d82e0e1464f65d862cc5e71da70e94b2c",
        strip_prefix = "instant-0.1.12",
        build_file = Label("//third_party/rust/remote:BUILD.instant-0.1.12.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__ipnet__2_5_1",
        url = "https://crates.io/api/v1/crates/ipnet/2.5.1/download",
        type = "tar.gz",
        sha256 = "f88c5561171189e69df9d98bcf18fd5f9558300f7ea7b801eb8a0fd748bd8745",
        strip_prefix = "ipnet-2.5.1",
        build_file = Label("//third_party/rust/remote:BUILD.ipnet-2.5.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__itertools__0_10_5",
        url = "https://crates.io/api/v1/crates/itertools/0.10.5/download",
        type = "tar.gz",
        sha256 = "b0fd2260e829bddf4cb6ea802289de2f86d6a7a690192fbe91b3f46e0f2c8473",
        strip_prefix = "itertools-0.10.5",
        build_file = Label("//third_party/rust/remote:BUILD.itertools-0.10.5.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__itoa__1_0_4",
        url = "https://crates.io/api/v1/crates/itoa/1.0.4/download",
        type = "tar.gz",
        sha256 = "4217ad341ebadf8d8e724e264f13e593e0648f5b3e94b3896a5df283be015ecc",
        strip_prefix = "itoa-1.0.4",
        build_file = Label("//third_party/rust/remote:BUILD.itoa-1.0.4.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__js_sys__0_3_60",
        url = "https://crates.io/api/v1/crates/js-sys/0.3.60/download",
        type = "tar.gz",
        sha256 = "49409df3e3bf0856b916e2ceaca09ee28e6871cf7d9ce97a692cacfdb2a25a47",
        strip_prefix = "js-sys-0.3.60",
        build_file = Label("//third_party/rust/remote:BUILD.js-sys-0.3.60.bazel"),
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
        name = "raze__libc__0_2_137",
        url = "https://crates.io/api/v1/crates/libc/0.2.137/download",
        type = "tar.gz",
        sha256 = "fc7fcc620a3bff7cdd7a365be3376c97191aeaccc2a603e600951e452615bf89",
        strip_prefix = "libc-0.2.137",
        build_file = Label("//third_party/rust/remote:BUILD.libc-0.2.137.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__log__0_4_17",
        url = "https://crates.io/api/v1/crates/log/0.4.17/download",
        type = "tar.gz",
        sha256 = "abb12e687cfb44aa40f41fc3978ef76448f9b6038cad6aef4259d3c095a2382e",
        strip_prefix = "log-0.4.17",
        build_file = Label("//third_party/rust/remote:BUILD.log-0.4.17.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__memchr__2_5_0",
        url = "https://crates.io/api/v1/crates/memchr/2.5.0/download",
        type = "tar.gz",
        sha256 = "2dffe52ecf27772e601905b7522cb4ef790d2cc203488bbd0e2fe85fcb74566d",
        strip_prefix = "memchr-2.5.0",
        build_file = Label("//third_party/rust/remote:BUILD.memchr-2.5.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__memoffset__0_6_5",
        url = "https://crates.io/api/v1/crates/memoffset/0.6.5/download",
        type = "tar.gz",
        sha256 = "5aa361d4faea93603064a027415f07bd8e1d5c88c9fbf68bf56a285428fd79ce",
        strip_prefix = "memoffset-0.6.5",
        build_file = Label("//third_party/rust/remote:BUILD.memoffset-0.6.5.bazel"),
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
        name = "raze__mio__0_8_5",
        url = "https://crates.io/api/v1/crates/mio/0.8.5/download",
        type = "tar.gz",
        sha256 = "e5d732bc30207a6423068df043e3d02e0735b155ad7ce1a6f76fe2baa5b158de",
        strip_prefix = "mio-0.8.5",
        build_file = Label("//third_party/rust/remote:BUILD.mio-0.8.5.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__multimap__0_8_3",
        url = "https://crates.io/api/v1/crates/multimap/0.8.3/download",
        type = "tar.gz",
        sha256 = "e5ce46fe64a9d73be07dcbe690a38ce1b293be448fd8ce1e6c1b8062c9f72c6a",
        strip_prefix = "multimap-0.8.3",
        build_file = Label("//third_party/rust/remote:BUILD.multimap-0.8.3.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__num_cpus__1_14_0",
        url = "https://crates.io/api/v1/crates/num_cpus/1.14.0/download",
        type = "tar.gz",
        sha256 = "f6058e64324c71e02bc2b150e4f3bc8286db6c83092132ffa3f6b1eab0f9def5",
        strip_prefix = "num_cpus-1.14.0",
        build_file = Label("//third_party/rust/remote:BUILD.num_cpus-1.14.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__once_cell__1_16_0",
        url = "https://crates.io/api/v1/crates/once_cell/1.16.0/download",
        type = "tar.gz",
        sha256 = "86f0b0d4bf799edbc74508c1e8bf170ff5f41238e5f8225603ca7caaae2b7860",
        strip_prefix = "once_cell-1.16.0",
        build_file = Label("//third_party/rust/remote:BUILD.once_cell-1.16.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__os_str_bytes__6_3_1",
        url = "https://crates.io/api/v1/crates/os_str_bytes/6.3.1/download",
        type = "tar.gz",
        sha256 = "3baf96e39c5359d2eb0dd6ccb42c62b91d9678aa68160d261b9e0ccbf9e9dea9",
        strip_prefix = "os_str_bytes-6.3.1",
        build_file = Label("//third_party/rust/remote:BUILD.os_str_bytes-6.3.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__percent_encoding__2_2_0",
        url = "https://crates.io/api/v1/crates/percent-encoding/2.2.0/download",
        type = "tar.gz",
        sha256 = "478c572c3d73181ff3c2539045f6eb99e5491218eae919370993b890cdbdd98e",
        strip_prefix = "percent-encoding-2.2.0",
        build_file = Label("//third_party/rust/remote:BUILD.percent-encoding-2.2.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__petgraph__0_6_2",
        url = "https://crates.io/api/v1/crates/petgraph/0.6.2/download",
        type = "tar.gz",
        sha256 = "e6d5014253a1331579ce62aa67443b4a658c5e7dd03d4bc6d302b94474888143",
        strip_prefix = "petgraph-0.6.2",
        build_file = Label("//third_party/rust/remote:BUILD.petgraph-0.6.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__pin_project__1_0_12",
        url = "https://crates.io/api/v1/crates/pin-project/1.0.12/download",
        type = "tar.gz",
        sha256 = "ad29a609b6bcd67fee905812e544992d216af9d755757c05ed2d0e15a74c6ecc",
        strip_prefix = "pin-project-1.0.12",
        build_file = Label("//third_party/rust/remote:BUILD.pin-project-1.0.12.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__pin_project_internal__1_0_12",
        url = "https://crates.io/api/v1/crates/pin-project-internal/1.0.12/download",
        type = "tar.gz",
        sha256 = "069bdb1e05adc7a8990dce9cc75370895fbe4e3d58b9b73bf1aee56359344a55",
        strip_prefix = "pin-project-internal-1.0.12",
        build_file = Label("//third_party/rust/remote:BUILD.pin-project-internal-1.0.12.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__pin_project_lite__0_2_9",
        url = "https://crates.io/api/v1/crates/pin-project-lite/0.2.9/download",
        type = "tar.gz",
        sha256 = "e0a7ae3ac2f1173085d398531c705756c94a4c56843785df85a60c1a0afac116",
        strip_prefix = "pin-project-lite-0.2.9",
        build_file = Label("//third_party/rust/remote:BUILD.pin-project-lite-0.2.9.bazel"),
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
        name = "raze__ppv_lite86__0_2_17",
        url = "https://crates.io/api/v1/crates/ppv-lite86/0.2.17/download",
        type = "tar.gz",
        sha256 = "5b40af805b3121feab8a3c29f04d8ad262fa8e0561883e7653e024ae4479e6de",
        strip_prefix = "ppv-lite86-0.2.17",
        build_file = Label("//third_party/rust/remote:BUILD.ppv-lite86-0.2.17.bazel"),
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
        name = "raze__proc_macro2__1_0_47",
        url = "https://crates.io/api/v1/crates/proc-macro2/1.0.47/download",
        type = "tar.gz",
        sha256 = "5ea3d908b0e36316caf9e9e2c4625cdde190a7e6f440d794667ed17a1855e725",
        strip_prefix = "proc-macro2-1.0.47",
        build_file = Label("//third_party/rust/remote:BUILD.proc-macro2-1.0.47.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__prost__0_9_0",
        url = "https://crates.io/api/v1/crates/prost/0.9.0/download",
        type = "tar.gz",
        sha256 = "444879275cb4fd84958b1a1d5420d15e6fcf7c235fe47f053c9c2a80aceb6001",
        strip_prefix = "prost-0.9.0",
        build_file = Label("//third_party/rust/remote:BUILD.prost-0.9.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__prost_build__0_9_0",
        url = "https://crates.io/api/v1/crates/prost-build/0.9.0/download",
        type = "tar.gz",
        sha256 = "62941722fb675d463659e49c4f3fe1fe792ff24fe5bbaa9c08cd3b98a1c354f5",
        strip_prefix = "prost-build-0.9.0",
        build_file = Label("//third_party/rust/remote:BUILD.prost-build-0.9.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__prost_derive__0_9_0",
        url = "https://crates.io/api/v1/crates/prost-derive/0.9.0/download",
        type = "tar.gz",
        sha256 = "f9cc1a3263e07e0bf68e96268f37665207b49560d98739662cdfaae215c720fe",
        strip_prefix = "prost-derive-0.9.0",
        build_file = Label("//third_party/rust/remote:BUILD.prost-derive-0.9.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__prost_types__0_9_0",
        url = "https://crates.io/api/v1/crates/prost-types/0.9.0/download",
        type = "tar.gz",
        sha256 = "534b7a0e836e3c482d2693070f982e39e7611da9695d4d1f5a4b186b51faef0a",
        strip_prefix = "prost-types-0.9.0",
        build_file = Label("//third_party/rust/remote:BUILD.prost-types-0.9.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__quote__1_0_21",
        url = "https://crates.io/api/v1/crates/quote/1.0.21/download",
        type = "tar.gz",
        sha256 = "bbe448f377a7d6961e30f5955f9b8d106c3f5e449d493ee1b125c1d43c2b5179",
        strip_prefix = "quote-1.0.21",
        build_file = Label("//third_party/rust/remote:BUILD.quote-1.0.21.bazel"),
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
        name = "raze__rand__0_8_5",
        url = "https://crates.io/api/v1/crates/rand/0.8.5/download",
        type = "tar.gz",
        sha256 = "34af8d1a0e25924bc5b7c43c079c942339d8f0a8b57c39049bef581b46327404",
        strip_prefix = "rand-0.8.5",
        build_file = Label("//third_party/rust/remote:BUILD.rand-0.8.5.bazel"),
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
        name = "raze__rand_chacha__0_3_1",
        url = "https://crates.io/api/v1/crates/rand_chacha/0.3.1/download",
        type = "tar.gz",
        sha256 = "e6c10a63a0fa32252be49d21e7709d4d4baf8d231c2dbce1eaa8141b9b127d88",
        strip_prefix = "rand_chacha-0.3.1",
        build_file = Label("//third_party/rust/remote:BUILD.rand_chacha-0.3.1.bazel"),
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
        name = "raze__rand_core__0_6_4",
        url = "https://crates.io/api/v1/crates/rand_core/0.6.4/download",
        type = "tar.gz",
        sha256 = "ec0be4795e2f6a28069bec0b5ff3e2ac9bafc99e6a9a7dc3547996c5c816922c",
        strip_prefix = "rand_core-0.6.4",
        build_file = Label("//third_party/rust/remote:BUILD.rand_core-0.6.4.bazel"),
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
        name = "raze__rayon__1_5_3",
        url = "https://crates.io/api/v1/crates/rayon/1.5.3/download",
        type = "tar.gz",
        sha256 = "bd99e5772ead8baa5215278c9b15bf92087709e9c1b2d1f97cdb5a183c933a7d",
        strip_prefix = "rayon-1.5.3",
        build_file = Label("//third_party/rust/remote:BUILD.rayon-1.5.3.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__rayon_core__1_9_3",
        url = "https://crates.io/api/v1/crates/rayon-core/1.9.3/download",
        type = "tar.gz",
        sha256 = "258bcdb5ac6dad48491bb2992db6b7cf74878b0384908af124823d118c99683f",
        strip_prefix = "rayon-core-1.9.3",
        build_file = Label("//third_party/rust/remote:BUILD.rayon-core-1.9.3.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__redox_syscall__0_2_16",
        url = "https://crates.io/api/v1/crates/redox_syscall/0.2.16/download",
        type = "tar.gz",
        sha256 = "fb5a58c1855b4b6819d59012155603f0b22ad30cad752600aadfcb695265519a",
        strip_prefix = "redox_syscall-0.2.16",
        build_file = Label("//third_party/rust/remote:BUILD.redox_syscall-0.2.16.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__regex__1_7_0",
        url = "https://crates.io/api/v1/crates/regex/1.7.0/download",
        type = "tar.gz",
        sha256 = "e076559ef8e241f2ae3479e36f97bd5741c0330689e217ad51ce2c76808b868a",
        strip_prefix = "regex-1.7.0",
        build_file = Label("//third_party/rust/remote:BUILD.regex-1.7.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__regex_syntax__0_6_28",
        url = "https://crates.io/api/v1/crates/regex-syntax/0.6.28/download",
        type = "tar.gz",
        sha256 = "456c603be3e8d448b072f410900c09faf164fbce2d480456f50eea6e25f9c848",
        strip_prefix = "regex-syntax-0.6.28",
        build_file = Label("//third_party/rust/remote:BUILD.regex-syntax-0.6.28.bazel"),
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
        name = "raze__reqwest__0_11_12",
        url = "https://crates.io/api/v1/crates/reqwest/0.11.12/download",
        type = "tar.gz",
        sha256 = "431949c384f4e2ae07605ccaa56d1d9d2ecdb5cadd4f9577ccfab29f2e5149fc",
        strip_prefix = "reqwest-0.11.12",
        build_file = Label("//third_party/rust/remote:BUILD.reqwest-0.11.12.bazel"),
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
        name = "raze__rustls__0_20_7",
        url = "https://crates.io/api/v1/crates/rustls/0.20.7/download",
        type = "tar.gz",
        sha256 = "539a2bfe908f471bfa933876bd1eb6a19cf2176d375f82ef7f99530a40e48c2c",
        strip_prefix = "rustls-0.20.7",
        build_file = Label("//third_party/rust/remote:BUILD.rustls-0.20.7.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__rustls_pemfile__1_0_1",
        url = "https://crates.io/api/v1/crates/rustls-pemfile/1.0.1/download",
        type = "tar.gz",
        sha256 = "0864aeff53f8c05aa08d86e5ef839d3dfcf07aeba2db32f12db0ef716e87bd55",
        strip_prefix = "rustls-pemfile-1.0.1",
        build_file = Label("//third_party/rust/remote:BUILD.rustls-pemfile-1.0.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__ryu__1_0_11",
        url = "https://crates.io/api/v1/crates/ryu/1.0.11/download",
        type = "tar.gz",
        sha256 = "4501abdff3ae82a1c1b477a17252eb69cee9e66eb915c1abaa4f44d873df9f09",
        strip_prefix = "ryu-1.0.11",
        build_file = Label("//third_party/rust/remote:BUILD.ryu-1.0.11.bazel"),
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
        name = "raze__sct__0_7_0",
        url = "https://crates.io/api/v1/crates/sct/0.7.0/download",
        type = "tar.gz",
        sha256 = "d53dcdb7c9f8158937a7981b48accfd39a43af418591a5d008c7b22b5e1b7ca4",
        strip_prefix = "sct-0.7.0",
        build_file = Label("//third_party/rust/remote:BUILD.sct-0.7.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__serde__1_0_147",
        url = "https://crates.io/api/v1/crates/serde/1.0.147/download",
        type = "tar.gz",
        sha256 = "d193d69bae983fc11a79df82342761dfbf28a99fc8d203dca4c3c1b590948965",
        strip_prefix = "serde-1.0.147",
        build_file = Label("//third_party/rust/remote:BUILD.serde-1.0.147.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__serde_derive__1_0_147",
        url = "https://crates.io/api/v1/crates/serde_derive/1.0.147/download",
        type = "tar.gz",
        sha256 = "4f1d362ca8fc9c3e3a7484440752472d68a6caa98f1ab81d99b5dfe517cec852",
        strip_prefix = "serde_derive-1.0.147",
        build_file = Label("//third_party/rust/remote:BUILD.serde_derive-1.0.147.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__serde_json__1_0_87",
        url = "https://crates.io/api/v1/crates/serde_json/1.0.87/download",
        type = "tar.gz",
        sha256 = "6ce777b7b150d76b9cf60d28b55f5847135a003f7d7350c6be7a773508ce7d45",
        strip_prefix = "serde_json-1.0.87",
        build_file = Label("//third_party/rust/remote:BUILD.serde_json-1.0.87.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__serde_urlencoded__0_7_1",
        url = "https://crates.io/api/v1/crates/serde_urlencoded/0.7.1/download",
        type = "tar.gz",
        sha256 = "d3491c14715ca2294c4d6a88f15e84739788c1d030eed8c110436aafdaa2f3fd",
        strip_prefix = "serde_urlencoded-0.7.1",
        build_file = Label("//third_party/rust/remote:BUILD.serde_urlencoded-0.7.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__slab__0_4_7",
        url = "https://crates.io/api/v1/crates/slab/0.4.7/download",
        type = "tar.gz",
        sha256 = "4614a76b2a8be0058caa9dbbaf66d988527d86d003c11a94fbd335d7661edcef",
        strip_prefix = "slab-0.4.7",
        build_file = Label("//third_party/rust/remote:BUILD.slab-0.4.7.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__socket2__0_4_7",
        url = "https://crates.io/api/v1/crates/socket2/0.4.7/download",
        type = "tar.gz",
        sha256 = "02e2d2db9033d13a1567121ddd7a095ee144db4e1ca1b1bda3419bc0da294ebd",
        strip_prefix = "socket2-0.4.7",
        build_file = Label("//third_party/rust/remote:BUILD.socket2-0.4.7.bazel"),
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
        name = "raze__syn__1_0_103",
        url = "https://crates.io/api/v1/crates/syn/1.0.103/download",
        type = "tar.gz",
        sha256 = "a864042229133ada95abf3b54fdc62ef5ccabe9515b64717bcb9a1919e59445d",
        strip_prefix = "syn-1.0.103",
        build_file = Label("//third_party/rust/remote:BUILD.syn-1.0.103.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tempfile__3_3_0",
        url = "https://crates.io/api/v1/crates/tempfile/3.3.0/download",
        type = "tar.gz",
        sha256 = "5cdb1ef4eaeeaddc8fbd371e5017057064af0911902ef36b39801f67cc6d79e4",
        strip_prefix = "tempfile-3.3.0",
        build_file = Label("//third_party/rust/remote:BUILD.tempfile-3.3.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__termcolor__1_1_3",
        url = "https://crates.io/api/v1/crates/termcolor/1.1.3/download",
        type = "tar.gz",
        sha256 = "bab24d30b911b2376f3a13cc2cd443142f0c81dda04c118693e35b3835757755",
        strip_prefix = "termcolor-1.1.3",
        build_file = Label("//third_party/rust/remote:BUILD.termcolor-1.1.3.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__textwrap__0_16_0",
        url = "https://crates.io/api/v1/crates/textwrap/0.16.0/download",
        type = "tar.gz",
        sha256 = "222a222a5bfe1bba4a77b45ec488a741b3cb8872e5e499451fd7d0129c9c7c3d",
        strip_prefix = "textwrap-0.16.0",
        build_file = Label("//third_party/rust/remote:BUILD.textwrap-0.16.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__thiserror__1_0_37",
        url = "https://crates.io/api/v1/crates/thiserror/1.0.37/download",
        type = "tar.gz",
        sha256 = "10deb33631e3c9018b9baf9dcbbc4f737320d2b576bac10f6aefa048fa407e3e",
        strip_prefix = "thiserror-1.0.37",
        build_file = Label("//third_party/rust/remote:BUILD.thiserror-1.0.37.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__thiserror_impl__1_0_37",
        url = "https://crates.io/api/v1/crates/thiserror-impl/1.0.37/download",
        type = "tar.gz",
        sha256 = "982d17546b47146b28f7c22e3d08465f6b8903d0ea13c1660d9d84a6e7adcdbb",
        strip_prefix = "thiserror-impl-1.0.37",
        build_file = Label("//third_party/rust/remote:BUILD.thiserror-impl-1.0.37.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tinyvec__1_6_0",
        url = "https://crates.io/api/v1/crates/tinyvec/1.6.0/download",
        type = "tar.gz",
        sha256 = "87cc5ceb3875bb20c2890005a4e226a4651264a5c75edb2421b52861a0a0cb50",
        strip_prefix = "tinyvec-1.6.0",
        build_file = Label("//third_party/rust/remote:BUILD.tinyvec-1.6.0.bazel"),
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
        name = "raze__tokio__1_21_2",
        url = "https://crates.io/api/v1/crates/tokio/1.21.2/download",
        type = "tar.gz",
        sha256 = "a9e03c497dc955702ba729190dc4aac6f2a0ce97f913e5b1b5912fc5039d9099",
        strip_prefix = "tokio-1.21.2",
        build_file = Label("//third_party/rust/remote:BUILD.tokio-1.21.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tokio_io_timeout__1_2_0",
        url = "https://crates.io/api/v1/crates/tokio-io-timeout/1.2.0/download",
        type = "tar.gz",
        sha256 = "30b74022ada614a1b4834de765f9bb43877f910cc8ce4be40e89042c9223a8bf",
        strip_prefix = "tokio-io-timeout-1.2.0",
        build_file = Label("//third_party/rust/remote:BUILD.tokio-io-timeout-1.2.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tokio_macros__1_8_0",
        url = "https://crates.io/api/v1/crates/tokio-macros/1.8.0/download",
        type = "tar.gz",
        sha256 = "9724f9a975fb987ef7a3cd9be0350edcbe130698af5b8f7a631e23d42d052484",
        strip_prefix = "tokio-macros-1.8.0",
        build_file = Label("//third_party/rust/remote:BUILD.tokio-macros-1.8.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tokio_rustls__0_23_4",
        url = "https://crates.io/api/v1/crates/tokio-rustls/0.23.4/download",
        type = "tar.gz",
        sha256 = "c43ee83903113e03984cb9e5cebe6c04a5116269e900e3ddba8f068a62adda59",
        strip_prefix = "tokio-rustls-0.23.4",
        build_file = Label("//third_party/rust/remote:BUILD.tokio-rustls-0.23.4.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tokio_stream__0_1_11",
        url = "https://crates.io/api/v1/crates/tokio-stream/0.1.11/download",
        type = "tar.gz",
        sha256 = "d660770404473ccd7bc9f8b28494a811bc18542b915c0855c51e8f419d5223ce",
        strip_prefix = "tokio-stream-0.1.11",
        build_file = Label("//third_party/rust/remote:BUILD.tokio-stream-0.1.11.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tokio_util__0_6_10",
        url = "https://crates.io/api/v1/crates/tokio-util/0.6.10/download",
        type = "tar.gz",
        sha256 = "36943ee01a6d67977dd3f84a5a1d2efeb4ada3a1ae771cadfaa535d9d9fc6507",
        strip_prefix = "tokio-util-0.6.10",
        build_file = Label("//third_party/rust/remote:BUILD.tokio-util-0.6.10.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tokio_util__0_7_4",
        url = "https://crates.io/api/v1/crates/tokio-util/0.7.4/download",
        type = "tar.gz",
        sha256 = "0bb2e075f03b3d66d8d8785356224ba688d2906a371015e225beeb65ca92c740",
        strip_prefix = "tokio-util-0.7.4",
        build_file = Label("//third_party/rust/remote:BUILD.tokio-util-0.7.4.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tonic__0_6_2",
        url = "https://crates.io/api/v1/crates/tonic/0.6.2/download",
        type = "tar.gz",
        sha256 = "ff08f4649d10a70ffa3522ca559031285d8e421d727ac85c60825761818f5d0a",
        strip_prefix = "tonic-0.6.2",
        build_file = Label("//third_party/rust/remote:BUILD.tonic-0.6.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tonic_build__0_6_2",
        url = "https://crates.io/api/v1/crates/tonic-build/0.6.2/download",
        type = "tar.gz",
        sha256 = "9403f1bafde247186684b230dc6f38b5cd514584e8bec1dd32514be4745fa757",
        strip_prefix = "tonic-build-0.6.2",
        build_file = Label("//third_party/rust/remote:BUILD.tonic-build-0.6.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tonic_reflection__0_3_0",
        url = "https://crates.io/api/v1/crates/tonic-reflection/0.3.0/download",
        type = "tar.gz",
        sha256 = "228cc5aa5d3e6e0624b5f756a7558038ee86428d1d58d8c6e551b389b12cf355",
        strip_prefix = "tonic-reflection-0.3.0",
        build_file = Label("//third_party/rust/remote:BUILD.tonic-reflection-0.3.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tower__0_4_13",
        url = "https://crates.io/api/v1/crates/tower/0.4.13/download",
        type = "tar.gz",
        sha256 = "b8fa9be0de6cf49e536ce1851f987bd21a43b771b09473c3549a6c853db37c1c",
        strip_prefix = "tower-0.4.13",
        build_file = Label("//third_party/rust/remote:BUILD.tower-0.4.13.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tower_layer__0_3_2",
        url = "https://crates.io/api/v1/crates/tower-layer/0.3.2/download",
        type = "tar.gz",
        sha256 = "c20c8dbed6283a09604c3e69b4b7eeb54e298b8a600d4d5ecb5ad39de609f1d0",
        strip_prefix = "tower-layer-0.3.2",
        build_file = Label("//third_party/rust/remote:BUILD.tower-layer-0.3.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tower_service__0_3_2",
        url = "https://crates.io/api/v1/crates/tower-service/0.3.2/download",
        type = "tar.gz",
        sha256 = "b6bc1c9ce2b5135ac7f93c72918fc37feb872bdc6a5533a8b85eb4b86bfdae52",
        strip_prefix = "tower-service-0.3.2",
        build_file = Label("//third_party/rust/remote:BUILD.tower-service-0.3.2.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tracing__0_1_37",
        url = "https://crates.io/api/v1/crates/tracing/0.1.37/download",
        type = "tar.gz",
        sha256 = "8ce8c33a8d48bd45d624a6e523445fd21ec13d3653cd51f681abf67418f54eb8",
        strip_prefix = "tracing-0.1.37",
        build_file = Label("//third_party/rust/remote:BUILD.tracing-0.1.37.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tracing_attributes__0_1_23",
        url = "https://crates.io/api/v1/crates/tracing-attributes/0.1.23/download",
        type = "tar.gz",
        sha256 = "4017f8f45139870ca7e672686113917c71c7a6e02d4924eda67186083c03081a",
        strip_prefix = "tracing-attributes-0.1.23",
        build_file = Label("//third_party/rust/remote:BUILD.tracing-attributes-0.1.23.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tracing_core__0_1_30",
        url = "https://crates.io/api/v1/crates/tracing-core/0.1.30/download",
        type = "tar.gz",
        sha256 = "24eb03ba0eab1fd845050058ce5e616558e8f8d8fca633e6b163fe25c797213a",
        strip_prefix = "tracing-core-0.1.30",
        build_file = Label("//third_party/rust/remote:BUILD.tracing-core-0.1.30.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__tracing_futures__0_2_5",
        url = "https://crates.io/api/v1/crates/tracing-futures/0.2.5/download",
        type = "tar.gz",
        sha256 = "97d095ae15e245a057c8e8451bab9b3ee1e1f68e9ba2b4fbc18d0ac5237835f2",
        strip_prefix = "tracing-futures-0.2.5",
        build_file = Label("//third_party/rust/remote:BUILD.tracing-futures-0.2.5.bazel"),
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
        name = "raze__unicode_bidi__0_3_8",
        url = "https://crates.io/api/v1/crates/unicode-bidi/0.3.8/download",
        type = "tar.gz",
        sha256 = "099b7128301d285f79ddd55b9a83d5e6b9e97c92e0ea0daebee7263e932de992",
        strip_prefix = "unicode-bidi-0.3.8",
        build_file = Label("//third_party/rust/remote:BUILD.unicode-bidi-0.3.8.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__unicode_ident__1_0_5",
        url = "https://crates.io/api/v1/crates/unicode-ident/1.0.5/download",
        type = "tar.gz",
        sha256 = "6ceab39d59e4c9499d4e5a8ee0e2735b891bb7308ac83dfb4e80cad195c9f6f3",
        strip_prefix = "unicode-ident-1.0.5",
        build_file = Label("//third_party/rust/remote:BUILD.unicode-ident-1.0.5.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__unicode_normalization__0_1_22",
        url = "https://crates.io/api/v1/crates/unicode-normalization/0.1.22/download",
        type = "tar.gz",
        sha256 = "5c5713f0fc4b5db668a2ac63cdb7bb4469d8c9fed047b1d0292cc7b0ce2ba921",
        strip_prefix = "unicode-normalization-0.1.22",
        build_file = Label("//third_party/rust/remote:BUILD.unicode-normalization-0.1.22.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__unicode_segmentation__1_10_0",
        url = "https://crates.io/api/v1/crates/unicode-segmentation/1.10.0/download",
        type = "tar.gz",
        sha256 = "0fdbf052a0783de01e944a6ce7a8cb939e295b1e7be835a1112c3b9a7f047a5a",
        strip_prefix = "unicode-segmentation-1.10.0",
        build_file = Label("//third_party/rust/remote:BUILD.unicode-segmentation-1.10.0.bazel"),
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
        name = "raze__url__2_3_1",
        url = "https://crates.io/api/v1/crates/url/2.3.1/download",
        type = "tar.gz",
        sha256 = "0d68c799ae75762b8c3fe375feb6600ef5602c883c5d21eb51c09f22b83c4643",
        strip_prefix = "url-2.3.1",
        build_file = Label("//third_party/rust/remote:BUILD.url-2.3.1.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__version_check__0_9_4",
        url = "https://crates.io/api/v1/crates/version_check/0.9.4/download",
        type = "tar.gz",
        sha256 = "49874b5167b65d7193b8aba1567f5c7d93d001cafc34600cee003eda787e483f",
        strip_prefix = "version_check-0.9.4",
        build_file = Label("//third_party/rust/remote:BUILD.version_check-0.9.4.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__walkdir__2_3_2",
        url = "https://crates.io/api/v1/crates/walkdir/2.3.2/download",
        type = "tar.gz",
        sha256 = "808cf2735cd4b6866113f648b791c6adc5714537bc222d9347bb203386ffda56",
        strip_prefix = "walkdir-2.3.2",
        build_file = Label("//third_party/rust/remote:BUILD.walkdir-2.3.2.bazel"),
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
        name = "raze__wasi__0_11_0_wasi_snapshot_preview1",
        url = "https://crates.io/api/v1/crates/wasi/0.11.0+wasi-snapshot-preview1/download",
        type = "tar.gz",
        sha256 = "9c8d87e72b64a3b4db28d11ce29237c246188f4f51057d65a7eab63b7987e423",
        strip_prefix = "wasi-0.11.0+wasi-snapshot-preview1",
        build_file = Label("//third_party/rust/remote:BUILD.wasi-0.11.0+wasi-snapshot-preview1.bazel"),
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
        name = "raze__wasm_bindgen__0_2_83",
        url = "https://crates.io/api/v1/crates/wasm-bindgen/0.2.83/download",
        type = "tar.gz",
        sha256 = "eaf9f5aceeec8be17c128b2e93e031fb8a4d469bb9c4ae2d7dc1888b26887268",
        strip_prefix = "wasm-bindgen-0.2.83",
        build_file = Label("//third_party/rust/remote:BUILD.wasm-bindgen-0.2.83.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__wasm_bindgen_backend__0_2_83",
        url = "https://crates.io/api/v1/crates/wasm-bindgen-backend/0.2.83/download",
        type = "tar.gz",
        sha256 = "4c8ffb332579b0557b52d268b91feab8df3615f265d5270fec2a8c95b17c1142",
        strip_prefix = "wasm-bindgen-backend-0.2.83",
        build_file = Label("//third_party/rust/remote:BUILD.wasm-bindgen-backend-0.2.83.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__wasm_bindgen_futures__0_4_33",
        url = "https://crates.io/api/v1/crates/wasm-bindgen-futures/0.4.33/download",
        type = "tar.gz",
        sha256 = "23639446165ca5a5de86ae1d8896b737ae80319560fbaa4c2887b7da6e7ebd7d",
        strip_prefix = "wasm-bindgen-futures-0.4.33",
        build_file = Label("//third_party/rust/remote:BUILD.wasm-bindgen-futures-0.4.33.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__wasm_bindgen_macro__0_2_83",
        url = "https://crates.io/api/v1/crates/wasm-bindgen-macro/0.2.83/download",
        type = "tar.gz",
        sha256 = "052be0f94026e6cbc75cdefc9bae13fd6052cdcaf532fa6c45e7ae33a1e6c810",
        strip_prefix = "wasm-bindgen-macro-0.2.83",
        build_file = Label("//third_party/rust/remote:BUILD.wasm-bindgen-macro-0.2.83.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__wasm_bindgen_macro_support__0_2_83",
        url = "https://crates.io/api/v1/crates/wasm-bindgen-macro-support/0.2.83/download",
        type = "tar.gz",
        sha256 = "07bc0c051dc5f23e307b13285f9d75df86bfdf816c5721e573dec1f9b8aa193c",
        strip_prefix = "wasm-bindgen-macro-support-0.2.83",
        build_file = Label("//third_party/rust/remote:BUILD.wasm-bindgen-macro-support-0.2.83.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__wasm_bindgen_shared__0_2_83",
        url = "https://crates.io/api/v1/crates/wasm-bindgen-shared/0.2.83/download",
        type = "tar.gz",
        sha256 = "1c38c045535d93ec4f0b4defec448e4291638ee608530863b1e2ba115d4fff7f",
        strip_prefix = "wasm-bindgen-shared-0.2.83",
        build_file = Label("//third_party/rust/remote:BUILD.wasm-bindgen-shared-0.2.83.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__web_sys__0_3_60",
        url = "https://crates.io/api/v1/crates/web-sys/0.3.60/download",
        type = "tar.gz",
        sha256 = "bcda906d8be16e728fd5adc5b729afad4e444e106ab28cd1c7256e54fa61510f",
        strip_prefix = "web-sys-0.3.60",
        build_file = Label("//third_party/rust/remote:BUILD.web-sys-0.3.60.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__webpki__0_22_0",
        url = "https://crates.io/api/v1/crates/webpki/0.22.0/download",
        type = "tar.gz",
        sha256 = "f095d78192e208183081cc07bc5515ef55216397af48b873e5edcd72637fa1bd",
        strip_prefix = "webpki-0.22.0",
        build_file = Label("//third_party/rust/remote:BUILD.webpki-0.22.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__webpki_roots__0_22_5",
        url = "https://crates.io/api/v1/crates/webpki-roots/0.22.5/download",
        type = "tar.gz",
        sha256 = "368bfe657969fb01238bb756d351dcade285e0f6fcbd36dcb23359a5169975be",
        strip_prefix = "webpki-roots-0.22.5",
        build_file = Label("//third_party/rust/remote:BUILD.webpki-roots-0.22.5.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__which__4_3_0",
        url = "https://crates.io/api/v1/crates/which/4.3.0/download",
        type = "tar.gz",
        sha256 = "1c831fbbee9e129a8cf93e7747a82da9d95ba8e16621cae60ec2cdc849bacb7b",
        strip_prefix = "which-4.3.0",
        build_file = Label("//third_party/rust/remote:BUILD.which-4.3.0.bazel"),
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
        name = "raze__windows_sys__0_42_0",
        url = "https://crates.io/api/v1/crates/windows-sys/0.42.0/download",
        type = "tar.gz",
        sha256 = "5a3e1820f08b8513f676f7ab6c1f99ff312fb97b553d30ff4dd86f9f15728aa7",
        strip_prefix = "windows-sys-0.42.0",
        build_file = Label("//third_party/rust/remote:BUILD.windows-sys-0.42.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__windows_aarch64_gnullvm__0_42_0",
        url = "https://crates.io/api/v1/crates/windows_aarch64_gnullvm/0.42.0/download",
        type = "tar.gz",
        sha256 = "41d2aa71f6f0cbe00ae5167d90ef3cfe66527d6f613ca78ac8024c3ccab9a19e",
        strip_prefix = "windows_aarch64_gnullvm-0.42.0",
        build_file = Label("//third_party/rust/remote:BUILD.windows_aarch64_gnullvm-0.42.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__windows_aarch64_msvc__0_42_0",
        url = "https://crates.io/api/v1/crates/windows_aarch64_msvc/0.42.0/download",
        type = "tar.gz",
        sha256 = "dd0f252f5a35cac83d6311b2e795981f5ee6e67eb1f9a7f64eb4500fbc4dcdb4",
        strip_prefix = "windows_aarch64_msvc-0.42.0",
        build_file = Label("//third_party/rust/remote:BUILD.windows_aarch64_msvc-0.42.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__windows_i686_gnu__0_42_0",
        url = "https://crates.io/api/v1/crates/windows_i686_gnu/0.42.0/download",
        type = "tar.gz",
        sha256 = "fbeae19f6716841636c28d695375df17562ca208b2b7d0dc47635a50ae6c5de7",
        strip_prefix = "windows_i686_gnu-0.42.0",
        build_file = Label("//third_party/rust/remote:BUILD.windows_i686_gnu-0.42.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__windows_i686_msvc__0_42_0",
        url = "https://crates.io/api/v1/crates/windows_i686_msvc/0.42.0/download",
        type = "tar.gz",
        sha256 = "84c12f65daa39dd2babe6e442988fc329d6243fdce47d7d2d155b8d874862246",
        strip_prefix = "windows_i686_msvc-0.42.0",
        build_file = Label("//third_party/rust/remote:BUILD.windows_i686_msvc-0.42.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__windows_x86_64_gnu__0_42_0",
        url = "https://crates.io/api/v1/crates/windows_x86_64_gnu/0.42.0/download",
        type = "tar.gz",
        sha256 = "bf7b1b21b5362cbc318f686150e5bcea75ecedc74dd157d874d754a2ca44b0ed",
        strip_prefix = "windows_x86_64_gnu-0.42.0",
        build_file = Label("//third_party/rust/remote:BUILD.windows_x86_64_gnu-0.42.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__windows_x86_64_gnullvm__0_42_0",
        url = "https://crates.io/api/v1/crates/windows_x86_64_gnullvm/0.42.0/download",
        type = "tar.gz",
        sha256 = "09d525d2ba30eeb3297665bd434a54297e4170c7f1a44cad4ef58095b4cd2028",
        strip_prefix = "windows_x86_64_gnullvm-0.42.0",
        build_file = Label("//third_party/rust/remote:BUILD.windows_x86_64_gnullvm-0.42.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__windows_x86_64_msvc__0_42_0",
        url = "https://crates.io/api/v1/crates/windows_x86_64_msvc/0.42.0/download",
        type = "tar.gz",
        sha256 = "f40009d85759725a34da6d89a94e63d7bdc50a862acf0dbc7c8e488f1edcb6f5",
        strip_prefix = "windows_x86_64_msvc-0.42.0",
        build_file = Label("//third_party/rust/remote:BUILD.windows_x86_64_msvc-0.42.0.bazel"),
    )

    maybe(
        http_archive,
        name = "raze__winreg__0_10_1",
        url = "https://crates.io/api/v1/crates/winreg/0.10.1/download",
        type = "tar.gz",
        sha256 = "80d0f4e272c85def139476380b12f9ac60926689dd2e01d4923222f40580869d",
        strip_prefix = "winreg-0.10.1",
        build_file = Label("//third_party/rust/remote:BUILD.winreg-0.10.1.bazel"),
    )
