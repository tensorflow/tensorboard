# Copyright 2016 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Rules that construct Typescript Polymer components for TensorBoard

load("//javascript/typescript:build_defs.bzl", "ts_config")
load("//javascript/typescript:build_defs.bzl", "ts_declaration")
load("//javascript/typescript:build_defs.bzl", "ts_development_sources")
load("//javascript/typescript:build_defs.bzl", "ts_devserver")
load("//javascript/typescript:build_defs.bzl", "ts_library")
load("//testing/karma/builddefs:karma_web_test_suite.bzl", "karma_web_test_suite")
load("//third_party/javascript/polymer/build_defs:build_defs.bzl", "wct_test_suite")
load("//third_party/javascript/polymer/build_defs:build_defs.bzl", "webcomponent_library")
load("//tensorboard:defs.bzl", "tensorboard_typescript_genrule")

_DEFAULT_BROWSERS = [
    "//testing/web/browsers:chrome-linux",
    "//testing/web/browsers:firefox-linux",
    # TODO(b/37250134): Re-enable when not flaky.
    # "//testing/web/browsers:chrome-win7",
    # "//testing/web/browsers:firefox-win7",
]

def tensorboard_karma_web_test_suite(**kwargs):
  """Internal-only delegate for karma_web_test_suite."""
  karma_web_test_suite(**kwargs)

def tensorboard_ts_config(**kwargs):
  """Internal-only delegate for ts_config."""
  ts_config(**kwargs)

def tensorboard_ts_declaration(**kwargs):
  """Internal-only delegate for ts_declaration."""
  ts_declaration(**kwargs)

def tensorboard_ts_development_sources(**kwargs):
  """Internal-only delegate for ts_development_sources."""
  ts_development_sources(**kwargs)

def tensorboard_ts_devserver(**kwargs):
  """Internal-only delegate for ts_devserver."""
  ts_devserver(**kwargs)

def tensorboard_ts_library(**kwargs):
  """Internal-only delegate for ts_library."""
  ts_library(**kwargs)

def tensorboard_webcomponent_library(strip_prefix="", **kwargs):
  """Internal-only delegate for webcomponent_library."""
  webcomponent_library(strip_prefix=strip_prefix, **kwargs)

def tensorboard_wct_test_suite(browsers=_DEFAULT_BROWSERS, **kwargs):
  """Internal-only delegate for wct_test_suite."""
  wct_test_suite(browsers=browsers, **kwargs)
