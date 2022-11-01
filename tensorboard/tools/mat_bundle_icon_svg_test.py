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

import dataclasses
import os

from tensorboard import test
from tensorboard.tools import mat_bundle_icon_svg


@dataclasses.dataclass(frozen=True)
class _TestableSvg:
    """Holds the information of a test SVG."""

    basename: str
    svg_content: str
    expected_content: str


TEST_SVG_A = _TestableSvg(
    "a.svg",
    '<svg><path d="M1,0L3,-1Z" /></svg>',
    '<svg id="a"><path d="M1,0L3,-1Z"/></svg>',
)
TEST_SVG_B = _TestableSvg(
    "b.svg",
    '<svg><circle r="3"></circle></svg>',
    '<svg id="b"><circle r="3"/></svg>',
)
TEST_SVG_C = _TestableSvg(
    "c.svg",
    '<svg><rect width="10"></rect></svg>',
    '<svg id="c"><rect width="10"/></svg>',
)


TEST_MALFORMED_A = _TestableSvg(
    "mal_b.svg",
    "<svg><defs></defs><defs></defs></svg>",
    "",
)


class MatBundleIconSvgTest(test.TestCase):
    def write_svgs(self, test_svg_files):
        for test_file in test_svg_files:
            with open(
                os.path.join(self.get_temp_dir(), test_file.basename), "w"
            ) as f:
                f.write(test_file.svg_content)

    def combine_svgs(self, test_svg_files):
        return mat_bundle_icon_svg.combine(
            [
                os.path.join(self.get_temp_dir(), test_file.basename)
                for test_file in test_svg_files
            ]
        )

    def assert_expected_xml(self, combined_content, test_svg_files):
        self.assertEqual(
            '<?xml version="1.0" ?><svg><defs>'
            + "".join(
                [test_file.expected_content for test_file in test_svg_files]
            )
            + "</defs></svg>",
            combined_content,
        )

    def test_combine(self):
        test_files = [TEST_SVG_A, TEST_SVG_B]
        self.write_svgs(test_files)
        output = self.combine_svgs(test_files)
        self.assert_expected_xml(output, test_files)

    def test_combine_single_svg(self):
        test_files = [TEST_SVG_A]
        self.write_svgs(test_files)
        output = self.combine_svgs(test_files)
        self.assert_expected_xml(output, test_files)

    def test_combine_no_files(self):
        test_files = [TEST_SVG_A]
        with self.assertRaises(FileNotFoundError):
            self.combine_svgs(test_files)

    def test_combine_partial_no_file(self):
        self.write_svgs([TEST_SVG_B])
        with self.assertRaises(FileNotFoundError):
            self.combine_svgs([TEST_SVG_A, TEST_SVG_B])

    def test_combine_multi_defs(self):
        self.write_svgs([TEST_MALFORMED_A])
        with self.assertRaises(ValueError):
            self.combine_svgs([TEST_MALFORMED_A])

    def test_combine_composition(self):
        self.write_svgs([TEST_SVG_A, TEST_SVG_B, TEST_SVG_C])
        a_plus_b_content = self.combine_svgs([TEST_SVG_A, TEST_SVG_B])
        A_PLUS_B = _TestableSvg(
            "a_plus_b.svg",
            a_plus_b_content,
            TEST_SVG_A.expected_content + TEST_SVG_B.expected_content,
        )
        self.write_svgs([A_PLUS_B])
        combined = self.combine_svgs([A_PLUS_B, TEST_SVG_C])
        self.assert_expected_xml(combined, [A_PLUS_B, TEST_SVG_C])

    def test_combine_composition_dup(self):
        self.write_svgs([TEST_SVG_A, TEST_SVG_B])
        a_plus_b_content = self.combine_svgs([TEST_SVG_A, TEST_SVG_B])
        A_PLUS_B = _TestableSvg(
            "a_plus_b.svg",
            a_plus_b_content,
            TEST_SVG_A.expected_content + TEST_SVG_B.expected_content,
        )
        self.write_svgs([A_PLUS_B])

        with self.assertRaisesRegex(
            ValueError, "Violation: SVG with these ids.+`srcs`: a"
        ):
            self.combine_svgs([A_PLUS_B, TEST_SVG_A])


if __name__ == "__main__":
    test.main()
