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

"""Combines input SVGs as `<defs>`.

mat_bundle_icon_svg combines SVGs into a single SVG bundle with sub-SVGs placed
inside `<defs>` with filename, without extension, as the ids. It prints the
resulting document to stdout.

Usage: python mat_bundle_icon_svg.py [in_1.svg] [in_2.svg] ...

Do note that the method composes like below:
python mat_bundle_icon_svg.py [in_1.svg] [in_2.svg] > out_1.svg
python mat_bundle_icon_svg.py [in_3.svg] [out_1.svg] > out_2.svg

However, it disallows same SVG (checked by the `id`) appearing more than once.
This is to prevent messy duplicated entries in the `srcs`.
"""

from os import path
from xml.dom import getDOMImplementation
from xml.dom import minidom
import sys


def combine(files):
    impl = getDOMImplementation()
    doc = impl.createDocument(None, "svg", None)
    defs = doc.createElement("defs")
    doc.documentElement.appendChild(defs)
    svgs_to_insert = []
    for filename in files:
        partial_doc = minidom.parse(filename)
        partial_defs = partial_doc.getElementsByTagName("defs")
        if partial_defs:
            if len(partial_defs) > 1:
                raise ValueError(
                    "Unexpected document structure. Expected only one `<defs>`"
                    "in '%s'." % filename
                )
            svgs_to_insert.extend(partial_defs[0].childNodes)
        else:
            maybe_svg_el = partial_doc.documentElement
            if maybe_svg_el.tagName != "svg":
                raise ValueError(
                    "Unexpected document. Expected '%s' to start with <svg>."
                    % filename
                )
            svg_el = maybe_svg_el

            basename = path.basename(filename)
            svg_el.setAttribute("id", path.splitext(basename)[0])
            svgs_to_insert.append(svg_el)

    svg_ids = set()
    duplicate_ids = set()
    for partial_svg in svgs_to_insert:
        svg_id = partial_svg.getAttribute("id")
        if not svg_id:
            raise ValueError(
                "Unexpected document type: expected SVG inside defs contain "
                "`id` attribute."
            )

        if svg_id in svg_ids:
            duplicate_ids.add(svg_id)

        svg_ids.add(svg_id)
        defs.appendChild(partial_svg)

    if duplicate_ids:
        raise ValueError(
            "Violation: SVG with these ids appeared more than once in `srcs`: "
            + ", ".join(duplicate_ids),
        )

    return doc.toxml()


if __name__ == "__main__":
    print(combine(sys.argv[1:]))
