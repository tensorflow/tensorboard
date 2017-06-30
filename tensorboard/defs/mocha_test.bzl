# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

load("//tensorboard/defs:web.bzl", "ts_web_library")
load("//tensorboard/defs:vulcanize.bzl", "tensorboard_html_binary")
load("@io_bazel_rules_webtesting//web:py.bzl", "py_web_test_suite")


def mocha_test(name, srcs, test_file, path, deps):
  ts_web_library(
    name = name + "_ts_web",
    srcs = srcs,
    path = path,
    deps = deps,
  )

  tensorboard_html_binary(
    name = name + "_mocha_test_devserver",
    compilation_level = "WHITESPACE_ONLY",
    input_path = path + "/" + test_file,
    output_path = "/index.html",
    deps = [":" + name + "_ts_web"]
  )

  py_web_test_suite(
    name = name,
    main = "//tensorboard/defs:mocha_driver.py",
    srcs = ["//tensorboard/defs:mocha_driver"],
    browsers = ["//tensorboard/functionaltests/browsers:chromium"],
    data = [":" + name + "_mocha_test_devserver"],
    srcs_version = "PY2AND3",
    deps = ["@io_bazel_rules_webtesting//testing/web"],
    size="small",
  )
