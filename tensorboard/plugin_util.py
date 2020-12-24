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
# ==============================================================================
"""Provides utilities that may be especially useful to plugins."""


import threading

from bleach.sanitizer import Cleaner

# pylint: disable=g-bad-import-order
# Google-only: import markdown_freewisdom
import markdown

from tensorboard import context as _context
from tensorboard.backend import experiment_id as _experiment_id


_ALLOWED_ATTRIBUTES = {
    "a": ["href", "title"],
    "img": ["src", "title", "alt"],
}

_ALLOWED_TAGS = [
    "ul",
    "ol",
    "li",
    "p",
    "pre",
    "code",
    "blockquote",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "br",
    "strong",
    "em",
    "a",
    "img",
    "table",
    "thead",
    "tbody",
    "td",
    "tr",
    "th",
]

# Cache Markdown converter to avoid expensive initialization at each
# call to `markdown_to_safe_html`. Cache a different instance per thread.
class _MarkdownStore(threading.local):
    def __init__(self):
        self.markdown = markdown.Markdown(
            extensions=["markdown.extensions.tables"]
        )


_MARKDOWN_STORE = _MarkdownStore()


# Cache Cleaner to avoid expensive initialization at each call to `clean`.
# Cache a different instance per thread.
class _CleanerStore(threading.local):
    def __init__(self):
        self.cleaner = Cleaner(
            tags=_ALLOWED_TAGS, attributes=_ALLOWED_ATTRIBUTES
        )


_CLEANER_STORE = _CleanerStore()


def markdown_to_safe_html(markdown_string):
    """Convert Markdown to HTML that's safe to splice into the DOM.

    Arguments:
      markdown_string: A Unicode string or UTF-8--encoded bytestring
        containing Markdown source. Markdown tables are supported.

    Returns:
      A string containing safe HTML.
    """
    return markdowns_to_safe_html([markdown_string], lambda xs: xs[0])


def markdowns_to_safe_html(markdown_strings, combine):
    """Convert multiple Markdown documents to one safe HTML document.

    One could also achieve this by calling `markdown_to_safe_html`
    multiple times and combining the results. Compared to that approach,
    this function may be faster, because HTML sanitization (which can be
    expensive) is performed only once rather than once per input. It may
    also be less precise: if one of the input documents has unsafe HTML
    that is sanitized away, that sanitization might affect other
    documents, even if those documents are safe.

    Args:
      markdown_strings: List of Markdown source strings to convert, as
        Unicode strings or UTF-8--encoded bytestrings. Markdown tables
        are supported.
      combine: Callback function that takes a list of unsafe HTML
        strings of the same shape as `markdown_strings` and combines
        them into a single unsafe HTML string, which will be sanitized
        and returned.

    Returns:
      A string containing safe HTML.
    """
    unsafe_htmls = []
    total_null_bytes = 0

    for source in markdown_strings:
        # Convert to utf-8 whenever we have a binary input.
        if isinstance(source, bytes):
            source_decoded = source.decode("utf-8")
            # Remove null bytes and warn if there were any, since it probably means
            # we were given a bad encoding.
            source = source_decoded.replace("\x00", "")
            total_null_bytes += len(source_decoded) - len(source)
        unsafe_html = _MARKDOWN_STORE.markdown.convert(source)
        unsafe_htmls.append(unsafe_html)

    unsafe_combined = combine(unsafe_htmls)
    sanitized_combined = _CLEANER_STORE.cleaner.clean(unsafe_combined)

    warning = ""
    if total_null_bytes:
        warning = (
            "<!-- WARNING: discarded %d null bytes in markdown string "
            "after UTF-8 decoding -->\n"
        ) % total_null_bytes

    return warning + sanitized_combined


def context(environ):
    """Get a TensorBoard `RequestContext` from a WSGI environment.

    Returns:
      A `RequestContext` value.
    """
    return _context.from_environ(environ)


def experiment_id(environ):
    """Determine the experiment ID associated with a WSGI request.

    Each request to TensorBoard has an associated experiment ID, which is
    always a string and may be empty. This experiment ID should be passed
    to data providers.

    Args:
      environ: A WSGI environment `dict`. For a Werkzeug request, this is
        `request.environ`.

    Returns:
      A experiment ID, as a possibly-empty `str`.
    """
    return environ.get(_experiment_id.WSGI_ENVIRON_KEY, "")
