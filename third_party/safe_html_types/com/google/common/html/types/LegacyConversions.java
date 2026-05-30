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

import javax.annotation.CheckReturnValue;

/**
 * Transitional utilities to unsafely trust random strings as {@code com.google.common.html.types}
 * types. Intended for temporary use when upgrading code that used to accept plain strings to use
 * {@code com.google.common.html.types} types, but where it's not practical to transitively update
 * callers.
 *
 * IMPORTANT: No new code should use the conversion methods in this package, they are intended for
 * refactoring old code to use {@code com.google.common.html.types} types. New code should
 * construct {@code com.google.common.html.types} types via their APIs, template systems or
 * sanitizers. If that’s not possible it should use {@link UncheckedConversions} and undergo
 * security review.
 */
@CheckReturnValue
public final class LegacyConversions {

  private LegacyConversions() {}

  /**
   * Converts a String into a SafeHtml, for refactoring legacy code. Please read class documentation
   * before using.
   */
  public static SafeHtml riskilyAssumeSafeHtml(String html) {
    return new SafeHtml(html);
  }

  /**
   * Converts a String into a SafeScript, for refactoring legacy code. Please read class
   * documentation before using.
   */
  public static SafeScript riskilyAssumeSafeScript(String script) {
    return new SafeScript(script);
  }

  /**
   * Converts a String into a SafeStyle, for refactoring legacy code. Please read class
   * documentation before using.
   */
  public static SafeStyle riskilyAssumeSafeStyle(String style) {
    return new SafeStyle(style);
  }

  /**
   * Converts a String into a SafeStyleSheet, for refactoring legacy code. Please read class
   * documentation before using.
   */
  public static SafeStyleSheet riskilyAssumeSafeStyleSheet(String stylesheet) {
    return new SafeStyleSheet(stylesheet);
  }

  /**
   * Converts a String into a SafeUrl, for refactoring legacy code. Please read class documentation
   * before using.
   */  public static SafeUrl riskilyAssumeSafeUrl(String url) {
    return new SafeUrl(url);
  }

  /**
   * Converts a String into a TrustedResourceUrl, for refactoring legacy code. Please read class
   * documentation before using.
   */
  public static TrustedResourceUrl riskilyAssumeTrustedResourceUrl(String url) {
    return new TrustedResourceUrl(url);
  }
}
