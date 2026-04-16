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
 * Unchecked conversions to create values of {@code com.google.common.html} types from plain
 * strings. Use of these functions could potentially result in instances of safe HTML types that
 * violate their type contracts, and hence result in security vulnerabilties.
 *
 * <p>Avoid use of the methods in this file whenever possible; instead prefer to create instances of
 * {@code com.google.common.html} types using inherently safe builders or template systems.
 *
 * <p>See
 * <a href="http://github.com/google/safe-html-types/blob/master/doc/safehtml-unchecked.md">
 * Guidelines for use of Unchecked Conversions of Security-Contract Types</a> if you need to use
 * these methods.
 *
 * <p>Example appropriate uses include:
 * <ul>
 * <li>Wrapping the result of general-purpose or application-specific content sanitizer libraries.
 * <li>Wrapping the result of rendering strictly contextually autoescaping templates (assuming the
 * template's autoescaping implementation is indeed strict enough to support the type contract).
 * </ul>
 *
 */
@CheckReturnValue
public final class UncheckedConversions {

  private UncheckedConversions() {}

/**
   * Converts a String into a SafeHtml.
   */
  public static SafeHtml safeHtmlFromStringKnownToSatisfyTypeContract(String html) {
    return new SafeHtml(html);
  }

  /**
   * Converts a String into a SafeScript.
   */
  public static SafeScript safeScriptFromStringKnownToSatisfyTypeContract(String script) {
    return new SafeScript(script);
  }

  /**
   * Converts a String into a SafeStyle.
   */
  public static SafeStyle safeStyleFromStringKnownToSatisfyTypeContract(String style) {
    return new SafeStyle(style);
  }

  /**
   * Converts a String into a SafeStyleSheet.
   */
  public static SafeStyleSheet safeStyleSheetFromStringKnownToSatisfyTypeContract(
      String stylesheet) {
    return new SafeStyleSheet(stylesheet);
  }

  /**
   * Converts a String into a SafeUrl.
   */
  public static SafeUrl safeUrlFromStringKnownToSatisfyTypeContract(String url) {
    return new SafeUrl(url);
  }

  /**
   * Converts a String into a TrustedResourceUrl.
   */
  public static TrustedResourceUrl trustedResourceUrlFromStringKnownToSatisfyTypeContract(
      String url) {
    return new TrustedResourceUrl(url);
  }
}
