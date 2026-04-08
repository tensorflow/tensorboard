// **** GENERATED CODE, DO NOT MODIFY ****
// This file was generated via preprocessing from input:
// java/com/google/common/html/types/BuilderUtils.java.tpl
// ***************************************
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.google.common.html.types;

import com.google.common.annotations.GwtCompatible;
import com.google.common.escape.Escaper;
import com.google.common.escape.Escapers;
import javax.annotation.CheckReturnValue;


/**
 * Static utility methods shared by safe-HTML types' factory and builder classes, such as
 * {@link SafeHtmls}, {@link SafeHtmlBuilder}, etc.
 */
@CheckReturnValue
@GwtCompatible
final class BuilderUtils {

  private BuilderUtils() {}

  static String coerceToInterchangeValid(String text) {
      // MOE elided code that uses a non-public library to make sure text only
      // contains minimally-encoded Unicode scalar values that can appear in
      // both HTML and XML.
      return text;

   }

  static String escapeHtmlInternal(String s) {
    return HTML_ESCAPER.escape(s);

  }

  // This is exactly what j.c.g.common.html.HtmlEscapers.htmlEscaper() does. However, depending on
  // j.c.g.common.html is problematic because it has no android target, substantial internal only
  // code, and it pulls a lot of other dependencies with it.
  private static final Escaper HTML_ESCAPER =
      Escapers.builder()
          .addEscape('"', "&quot;")
          // Note: "&apos;" is not defined in HTML 4.01.
          .addEscape('\'', "&#39;")
          .addEscape('&', "&amp;")
          .addEscape('<', "&lt;")
          .addEscape('>', "&gt;")
          .build();
}
