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

"""Tool for configuring Bazel to get Google Fonts at build time.

The Google Fonts service requires an Internet connection and is likely
blocked in China. It also doesn't keep with the open source ethos for an
open source command line program to need to contact a Google web server
in order to look fabulous.

This tool defaults to only using woff2 (https://caniuse.com/#feat=woff2)
because it's supported by all desktop browsers except Internet Explorer.
Safari support requires Mac OS X Sierra or later.
"""

import hashlib
import httplib
import itertools
import os
import re
import sys
import urlparse

import tensorflow as tf

ROBOTO_URLS = [
    'https://fonts.googleapis.com/css?family=Roboto:400,300,300italic,400italic,500,500italic,700,700italic',
    'https://fonts.googleapis.com/css?family=Roboto+Mono:400,700',
]

GOOGLE_LICENSE_HTML = '''\
<!--
@license
Copyright 2017 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->
'''

tf.flags.DEFINE_string('urls', ';'.join(ROBOTO_URLS),
                       'Google Fonts stylesheet URLs (semicolons delimited)')
tf.flags.DEFINE_string('path', '/font-roboto/roboto.html', 'Path of HTML file')
tf.flags.DEFINE_string('repo', 'com_google_fonts_roboto', 'Name of repository')
tf.flags.DEFINE_string('license', 'notice', 'Bazel category of license')
tf.flags.DEFINE_string('license_summary', 'Apache 2.0', 'License description')
tf.flags.DEFINE_string('license_html', GOOGLE_LICENSE_HTML,
                       'HTML @license comment')
tf.flags.DEFINE_string('user_agent',
                       'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) '
                       'AppleWebKit/537.36 (KHTML, like Gecko) '
                       'Chrome/62.0.3202.94 '
                       'Safari/537.36',
                       'HTTP User-Agent header to send to Google Fonts')
tf.flags.DEFINE_string('mirror', 'https://mirror.bazel.build/',
                       'Mirror URL prefix')
FLAGS = tf.app.flags.FLAGS

BAR = '/%s/' % ('*' * 78)
NON_REPO_PATTERN = re.compile(r'[^_a-z0-9]')
SCHEME_PATTERN = re.compile(r'https?://')
CSS_PATTERN = re.compile(r'(?:/\* (?P<language>[-\w]+) \*/\s+)?'
                         r'(?P<css>@font-face \{'
                         r'.*?family: [\'"]?(?P<family>[^\'"]+)'
                         r'.*?src: local\([\'"]?(?P<name>[^\'")]+)'
                         r'.*?url\([\'"]?(?P<url>[^\'")]+)'
                         r'.*?\})', re.S)


def open_url(url):
  ru = urlparse.urlparse(url)
  pu = urlparse.ParseResult('', '', ru.path, ru.params, ru.query, ru.fragment)
  if ru.scheme == 'https':
    c = httplib.HTTPSConnection(ru.netloc)
  else:
    c = httplib.HTTPConnection(ru.netloc)
  c.putrequest('GET', pu.geturl())
  c.putheader('User-Agent', FLAGS.user_agent)
  c.endheaders()
  return c.getresponse()


def get_sha256(fp):
  hasher = hashlib.sha256()
  for chunk in iter(lambda: fp.read(8 * 1024), ''):
    hasher.update(chunk)
  return hasher.hexdigest()


def get_mirror_url(original):
  return SCHEME_PATTERN.sub(FLAGS.mirror, original)


def get_css(m):
  url = m.group('url')
  path = os.path.dirname(FLAGS.path) + url[url.rindex('/'):]
  return m.group('css').replace(url, path)


def underify(g):
  return '_'.join(NON_REPO_PATTERN.sub('_', s.lower()) for s in g if s)


def add_inline_file(lines, inner_lines):
  for line in inner_lines:
    lines.append('        %r,' % line)


def get_html_file(css):
  result = []
  result.extend(FLAGS.license_html.split('\n'))
  result.append('<style>')
  for code in css:
    result.extend(code.split('\n'))
  result.append('</style>')
  return result


def get_extra_build_file_content(html):
  result = [
      'load("@io_bazel_rules_closure//closure:defs.bzl", "web_library")',
      '',
      'web_library(',
      '    name = "%s",' % FLAGS.repo,
      '    path = "%s",' % os.path.dirname(FLAGS.path),
      '    srcs = [',
      '        "%s",' % os.path.basename(FLAGS.path),
      '        ":files",',
      '    ],',
      ')',
      '',
      'genrule(',
      '    name = "html",',
      '    outs = ["%s"],' % os.path.basename(FLAGS.path),
      '    cmd = "\\n".join([',
      '        "cat <<\'EOF\' >$@",',
  ]
  add_inline_file(result, html)
  result.append('        "EOF",')
  result.append('    ]),')
  result.append(')')
  return result


def main(unused_argv=None):
  assets = []
  for url in FLAGS.urls.split(';'):
    for m in CSS_PATTERN.finditer(open_url(url).read()):
      assets.append(m)
  assets.sort(key=lambda m: (m.group('family'),
                        m.group('name'),
                        m.group('language')))

  sys.stdout.write(
      'filegroup_external(\n'
      '    name = "%s",\n'
      '    licenses = ["%s"],  # %s\n'
      '    sha256_urls = {\n' %
      (FLAGS.repo, FLAGS.license, FLAGS.license_summary))

  css = []
  for m in assets:
    css.append(get_css(m))
    sys.stdout.write(
        '        # %s (%s)\n'
        '        "%s": [\n'
        '            \"%s\",\n'
        '            \"%s\",\n'
        '        ],\n' %
        (m.group('name'),
         m.group('language') or 'all',
         get_sha256(open_url(m.group('url'))),
         get_mirror_url(m.group('url')),
         m.group('url')))

  sys.stdout.write(
      '    },\n'
      '    generated_rule_name = "files",\n'
      '    extra_build_file_content = "\\n".join([\n')
  result = []
  add_inline_file(
      result,
      get_extra_build_file_content(
          get_html_file(css)))
  for line in result:
    sys.stdout.write(line + '\n')
  sys.stdout.write(
      '    ]),\n'
      ')\n\n')


if __name__ == '__main__':
  tf.app.run(main)
