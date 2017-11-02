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

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import textwrap

import six
import tensorflow as tf

from tensorboard import plugin_util


class MarkdownToSafeHTMLTest(tf.test.TestCase):

  def _test(self, markdown_string, expected):
    actual = plugin_util.markdown_to_safe_html(markdown_string)
    self.assertEqual(expected, actual)

  def test_empty_input(self):
    self._test(u'', u'')

  def test_basic_formatting(self):
    self._test(u'# _Hello_, **world!**\n\n'
               'Check out [my website](http://example.com)!',
               u'<h1><em>Hello</em>, <strong>world!</strong></h1>\n'
               '<p>Check out <a href="http://example.com">my website</a>!</p>')

  def test_table_formatting(self):
    self._test(
        textwrap.dedent(
            u"""\
            Here is some data:

            TensorBoard usage | Happiness
            ------------------|----------
                          0.0 |       0.0
                          0.5 |       0.5
                          1.0 |       1.0

            Wouldn't you agree?"""),
        textwrap.dedent(
            u"""\
            <p>Here is some data:</p>
            <table>
            <thead>
            <tr>
            <th>TensorBoard usage</th>
            <th>Happiness</th>
            </tr>
            </thead>
            <tbody>
            <tr>
            <td>0.0</td>
            <td>0.0</td>
            </tr>
            <tr>
            <td>0.5</td>
            <td>0.5</td>
            </tr>
            <tr>
            <td>1.0</td>
            <td>1.0</td>
            </tr>
            </tbody>
            </table>
            <p>Wouldn't you agree?</p>"""))

  def test_whitelisted_tags_and_attributes_allowed(self):
    s = (u'Check out <a href="http://example.com" title="do it">'
         'my website</a>!')
    self._test(s, u'<p>%s</p>' % s)

  def test_arbitrary_tags_and_attributes_removed(self):
    self._test(u'We should bring back the <blink>blink tag</blink>; '
               '<a name="bookmark" href="http://please-dont.com">'
               'sign the petition!</a>',
               u'<p>We should bring back the '
               '&lt;blink&gt;blink tag&lt;/blink&gt;; '
               '<a href="http://please-dont.com">sign the petition!</a></p>')

  def test_javascript_hrefs_sanitized(self):
    self._test(u'A <a href="javascript:void0">sketchy link</a> for you',
               u'<p>A <a>sketchy link</a> for you</p>')

  def test_byte_strings_interpreted_as_utf8(self):
    s = u'> Look\u2014some UTF-8!'.encode('utf-8')
    assert isinstance(s, six.binary_type), (type(s), six.binary_type)
    self._test(s,
               u'<blockquote>\n<p>Look\u2014some UTF-8!</p>\n</blockquote>')

  def test_unicode_strings_passed_through(self):
    s = u'> Look\u2014some UTF-8!'
    assert not isinstance(s, six.binary_type), (type(s), six.binary_type)
    self._test(s,
               u'<blockquote>\n<p>Look\u2014some UTF-8!</p>\n</blockquote>')

  def test_null_bytes_stripped_before_markdown_processing(self):
    # If this function is mistakenly called with UTF-16 or UTF-32 encoded text,
    # there will probably be a bunch of null bytes. These would be stripped by
    # the sanitizer no matter what, but make sure we remove them before markdown
    # interpretation to avoid affecting output (e.g. middle-word underscores
    # would generate erroneous <em> tags like "un<em>der</em>score") and add an
    # HTML comment with a warning.
    s = u'un_der_score'.encode('utf-32-le')
    # UTF-32 encoding of ASCII will have 3 null bytes per char. 36 = 3 * 12.
    self._test(s,
               u'<!-- WARNING: discarded 36 null bytes in markdown string '
               'after UTF-8 decoding -->\n'
               '<p>un_der_score</p>')


if __name__ == '__main__':
  tf.test.main()
