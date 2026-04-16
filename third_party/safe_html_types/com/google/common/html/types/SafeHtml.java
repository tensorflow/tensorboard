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
import javax.annotation.concurrent.Immutable;
import jsinterop.annotations.JsType;

/**
 * A string that is safe to use in HTML context in DOM APIs and HTML documents.
 *
 * <p>A SafeHtml is a string-like object that carries the security type contract that its value as a
 * string will not cause untrusted script execution when evaluated as HTML in a browser.
 *
 * <p>Values of this type are guaranteed to be safe to use in HTML contexts, such as, assignment to
 * the innerHTML DOM property, or interpolation into a HTML template in HTML PC_DATA context, in
 * the sense that the use will not result in a Cross-Site-Scripting vulnerability.
 */
@CheckReturnValue
@Immutable
@JsType
public final class SafeHtml {

  /** The SafeHtml wrapping an empty string. */
  public static final SafeHtml EMPTY = new SafeHtml("");

  private final String privateDoNotAccessOrElseSafeHtmlWrappedValue;

  SafeHtml(String html) {
    if (html == null) {
      throw new NullPointerException();
    }
    this.privateDoNotAccessOrElseSafeHtmlWrappedValue = html;
  }

  @Override
  public int hashCode() {
    return privateDoNotAccessOrElseSafeHtmlWrappedValue.hashCode() ^ 0x33b02fa9;
  }

  @Override
  public boolean equals(Object other) {
    if (!(other instanceof SafeHtml)) {
      return false;
    }
    SafeHtml that = (SafeHtml) other;
    return this.privateDoNotAccessOrElseSafeHtmlWrappedValue.equals(
        that.privateDoNotAccessOrElseSafeHtmlWrappedValue);
  }

  /**
   * Returns a debug representation of this value's underlying string, NOT the string representation
   * of the SafeHtml.
   *
   * <p>Having {@code toString()} return a debug representation is intentional. This type has
   * a GWT-compiled JavaScript version; JavaScript has no static typing and a distinct method
   * method name provides a modicum of type-safety.
   *
   * @see #getSafeHtmlString
   */
  @Override
  public String toString() {
    return "SafeHtml{" + privateDoNotAccessOrElseSafeHtmlWrappedValue + "}";
  }

  /**
   * Returns this value's underlying string. See class documentation for what guarantees exist on
   * the returned string.
   */
  // NOTE(mlourenco): jslayout depends on this exact method name when generating code, be careful if
  // changing it.
  public String getSafeHtmlString() {
    return privateDoNotAccessOrElseSafeHtmlWrappedValue;
  }
}
