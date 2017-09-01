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

package(default_visibility = ["//tensorboard:internal"])

load("//tensorboard/defs:web.bzl", "ts_web_library")

licenses(["notice"])  # Apache 2.0

ts_web_library(
    name = "tf_pr_curve_dashboard",
    srcs = [
        "tf-pr-curve-card.html",
        "tf-pr-curve-dashboard.html",
        "tf-pr-curve-steps-selector.html",
    ],
    path = "/tf-pr-curve-dashboard",
    deps = [
        "//tensorboard/components/tf_backend",
        "//tensorboard/components/tf_dashboard_common",
        "//tensorboard/components/tf_color_scale",
        "//tensorboard/components/tf_card_heading",
        "//tensorboard/components/tf_paginated_view",
        "//tensorboard/components/tf_categorization_utils",
        "//tensorboard/components/tf_imports:polymer",
        "//tensorboard/components/tf_imports:lodash",
        "//tensorboard/components/tf_runs_selector",
        "//tensorboard/components/vz_line_chart",
        "@org_polymer_iron_icon//:org_polymer_iron_icon",
        "@org_polymer_paper_button//:org_polymer_paper_button",
        "@org_polymer_paper_icon_button//:org_polymer_paper_icon_button",
        "@org_polymer_paper_input//:org_polymer_paper_input",
        "@org_polymer_paper_slider//:org_polymer_paper_slider",
        "@org_polymer_paper_spinner//:org_polymer_paper_spinner",
    ],
)
