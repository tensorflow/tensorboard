# Copyright 2021 The TensorFlow Authors. All Rights Reserved.
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
# ==============================================================================

"""Tests for our composable SVG bundler."""

import os

from tensorboard import test
from tensorboard.tools import mat_bundle_icon_svg


class TestableSvg(object):
    def __init__(self, basename, svg_content, expected_svg_content):
        self._content = svg_content
        self.basename = basename
        self.expected_content = expected_svg_content

    # Decorator function.
    def __call__(self, fn):
        def _impl(test):
            self.write(test.get_temp_dir())
            fn(test)

        return _impl

    def write(self, tempdir):
        with open(os.path.join(tempdir, self.basename), "w") as f:
            f.write(self._content)


def make_write_svg_decorator(basename, svg_content, expected_svg_content):
    return TestableSvg(basename, svg_content, expected_svg_content)


svg_a = make_write_svg_decorator(
    "a.svg",
    '<svg><path d="M1,0L3,-1Z" /></svg>',
    '<svg id="a"><path d="M1,0L3,-1Z"/></svg>',
)
svg_b = make_write_svg_decorator(
    "b.svg",
    '<svg><circle r="3"></circle></svg>',
    '<svg id="b"><circle r="3"/></svg>',
)
svg_c = make_write_svg_decorator(
    "c.svg",
    '<svg><rect width="10"></rect></svg>',
    '<svg id="c"><rect width="10"/></svg>',
)

malformed_a = make_write_svg_decorator(
    "mal_a.svg",
    '<rect width="10"></rect>',
    "",
)

malformed_b = make_write_svg_decorator(
    "mal_b.svg",
    "<svg><defs></defs><defs></defs></svg>",
    "",
)


class MatBundleIconSvgTest(test.TestCase):
    def exec_and_assert(self, testables):
        tempdir = self.get_temp_dir()
        combined_content = mat_bundle_icon_svg.combine(
            [os.path.join(tempdir, testable.basename) for testable in testables]
        )

        self.assertEqual(
            '<?xml version="1.0" ?><svg><defs>'
            + "".join([testable.expected_content for testable in testables])
            + "</defs></svg>",
            combined_content,
        )

        return combined_content

    @svg_a
    @svg_b
    def test_combine(self):
        self.exec_and_assert([svg_a, svg_b])

    @svg_a
    def test_combine_single_svg(self):
        self.exec_and_assert([svg_a])

    def test_combine_no_files(self):
        with self.assertRaises(FileNotFoundError):
            self.exec_and_assert([svg_a])

    @svg_b
    def test_combine_partial_no_file(self):
        with self.assertRaises(FileNotFoundError):
            self.exec_and_assert([svg_a, svg_b])

    @malformed_b
    def test_combine_multi_defs(self):
        with self.assertRaises(ValueError):
            self.exec_and_assert([malformed_b])

    @svg_a
    @svg_b
    @svg_c
    def test_combine_composition(self):
        a_plus_b_content = self.exec_and_assert([svg_a, svg_b])

        a_plus_b = TestableSvg(
            "a_plus_b.svg",
            a_plus_b_content,
            svg_a.expected_content + svg_b.expected_content,
        )
        a_plus_b.write(self.get_temp_dir())

        self.exec_and_assert(
            [
                svg_c,
                a_plus_b,
            ]
        )

    @svg_a
    @svg_b
    def test_combine_composition_dup(self):
        a_plus_b_content = self.exec_and_assert([svg_a, svg_b])
        a_plus_b = TestableSvg(
            "a_plus_b.svg",
            a_plus_b_content,
            svg_a.expected_content + svg_b.expected_content,
        )
        a_plus_b.write(self.get_temp_dir())

        with self.assertRaisesRegex(
            ValueError, "Violation: SVG with these ids.+`srcs`: a"
        ):
            self.exec_and_assert(
                [
                    svg_a,
                    a_plus_b,
                ]
            )


if __name__ == "__main__":
    test.main()
