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
 * A string-like object which represents a CSS style sheet and that carries the security type
 * contract that its value, as a string, will not cause untrusted script execution (XSS) when
 * evaluated as CSS in a browser.
 *
 * A SafeStyleSheet's string representation ({@link #getSafeStyleSheetString()}) can safely be
 * interpolated as the content of a style element within HTML. The SafeStyleSheet string should
 * not be escaped before interpolation.
 *
 * A SafeStyleSheet can be constructed via security-reviewed unchecked conversions. In this case
 * producers of SafeStyleSheet must ensure themselves that the SafeStyleSheet does not contain
 * unsafe script. Note in particular that {@code &lt;} is dangerous, even when inside CSS strings,
 * and so should always be forbidden or CSS-escaped in user controlled input. For example,
 * if {@code &lt;/style&gt;&lt;script&gt;evil&lt;/script&gt;"} were interpolated
 * inside a CSS string, it would break out of the context of the original style element and
 * {@code evil} would execute. Also note that within an HTML style (raw text) element, HTML
 * character references, such as {@code &amp;lt;}, are not allowed. See
 * http://www.w3.org/TR/html5/scripting-1.html#restrictions-for-contents-of-script-elements
 * (similar considerations apply to the style element).
 */
@CheckReturnValue
@Immutable
@JsType
public final class SafeStyleSheet {

  /** The SafeStyleSheet wrapping an empty string. */
  public static final SafeStyleSheet EMPTY = new SafeStyleSheet("");

  private final String privateDoNotAccessOrElseSafeStyleSheetWrappedValue;

  SafeStyleSheet(String styleSheet) {
    if (styleSheet == null) {
      throw new NullPointerException();
    }
    privateDoNotAccessOrElseSafeStyleSheetWrappedValue = styleSheet;
  }

  @Override
  public int hashCode() {
    return privateDoNotAccessOrElseSafeStyleSheetWrappedValue.hashCode() ^ 0x70173910;
  }

  @Override
  public boolean equals(Object other) {
    if (!(other instanceof SafeStyleSheet)) {
      return false;
    }
    SafeStyleSheet that = (SafeStyleSheet) other;
    return this.privateDoNotAccessOrElseSafeStyleSheetWrappedValue.equals(
        that.privateDoNotAccessOrElseSafeStyleSheetWrappedValue);
  }

  /**
   * Returns a debug representation of this value's underlying string, NOT the string representation
   * of the style declaration(s).
   *
   * <p>Having {@code toString()} return a debug representation is intentional. This type has
   * a GWT-compiled JavaScript version; JavaScript has no static typing and a distinct method
   * method name provides a modicum of type-safety.
   *
   * @see #getSafeStyleSheetString
   */
  @Override
  public String toString() {
    return "SafeStyleSheet{" + privateDoNotAccessOrElseSafeStyleSheetWrappedValue + "}";
  }

  /**
   * Returns this value's underlying string. See class documentation for what guarantees exist on
   * the returned string.
   */
  // NOTE(mlourenco): jslayout depends on this exact method name when generating code, be careful if
  // changing it.
  public String getSafeStyleSheetString() {
    return privateDoNotAccessOrElseSafeStyleSheetWrappedValue;
  }
}
