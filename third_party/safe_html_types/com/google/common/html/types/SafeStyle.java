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
 * A string-like object which represents a sequence of CSS declarations
 * ({@code propertyName1: propertyvalue1; propertyName2: propertyValue2; ...}) and that carries the
 * security type contract that its value, as a string, will not cause untrusted script execution
 * (XSS) when evaluated as CSS in a browser.
 *
 * <p>A SafeStyle's string representation ({@link #getSafeStyleString()}) can safely be:
 * <ul>
 * <li>Interpolated as the content of a <b>quoted</b> HTML style attribute. However, the SafeStyle
 * string <b>must be HTML-attribute-escaped</b> before interpolation.
 * <li>Interpolated as the content of a {}-wrapped block within a stylesheet. '<' characters in the
 * SafeStyle string <b>must be CSS-escaped</b> before interpolation. The SafeStyle string is also
 * guaranteed not to be able to introduce new properties or elide existing ones.
 * <li>Interpolated as the content of a {}-wrapped block within an HTML <style> element. '<'
 * characters in the SafeStyle string <b>must be CSS-escaped</b> before interpolation.
 * <li>Assigned to the style property of a DOM node. The SafeStyle string should not be escaped
 * before being assigned to the property.
 * </ul>
 *
 * TODO(mlourenco): Do we need to require SafeStyle to be the entire content of a style attribute
 * or the {}-wrapped block above? It would seem that validating untrusted properties would be
 * enough to guarantee that it also would not affect any surrounding, constant, properties. See
 * discussion in cl/61826926.
 *
 * <p>A SafeStyle may never contain literal angle brackets. Otherwise, it could be unsafe to place
 * a SafeStyle into a &lt;style&gt; tag (where it can't be HTML escaped). For example, if the
 * SafeStyle containing "{@code font: 'foo &lt;style/&gt;&lt;script&gt;evil&lt;/script&gt;'}" were
 * interpolated within a &lt;style&gt; tag, this would then break out of the style context into
 * HTML.
 *
 * <p>A SafeStyle may contain literal single or double quotes, and as such the entire style string
 * must be escaped when used in a style attribute (if this were not the case, the string could
 * contain a matching quote that would escape from the style attribute).
 *
 * <p>Values of this type must be composable, i.e. for any two values {@code style1} and
 * {@code style2} of this type, {@code style1.getSafeStyleString() + style2.getSafeStyleString()}
 * must itself be a value that satisfies the SafeStyle type constraint. This requirement implies
 * that for any value {@code style} of this type, {@code style.getSafeStyleString()} must not end
 * in a "property value" or "property name" context. For example, a value of
 * {@code background:url("} or {@code font-} would not satisfy the SafeStyle contract. This is
 * because concatenating such strings with a second value that itself does not contain unsafe CSS
 * can result in an overall string that does. For example, if {@code javascript:evil())"} is
 * appended to {@code background:url("}, the resulting string may result in the execution of a
 * malicious script.
 *
 * TODO(mlourenco): Consider whether we should implement UTF-8 interchange-validity checks and
 * blacklisting of newlines (including Unicode ones) and other whitespace characters (\t, \f).
 * Document here if so and also update SafeStyles.fromConstant().
 *
 * <p>The following example values comply with this type's contract:
 * <ul>
 * <li><code>width: 1em;</code></li>
 * <li><code>height:1em;</code></li>
 * <li><code>width: 1em;height: 1em;</code></li>
 * <li><code>background:url('http://url');</code></li>
 * </ul>
 * In addition, the empty string is safe for use in a CSS attribute.
 *
 * <p>The following example values do <em>not</em> comply with this type's contract:
 * <ul>
 * <li><code>background: red</code> (missing a trailing semi-colon)</li>
 * <li><code>background:</code> (missing a value and a trailing semi-colon)</li>
 * <li><code>1em</code> (missing an attribute name, which provides context for the value)</li>
 * </ul>
 *
 * @see http://www.w3.org/TR/css3-syntax/
 */
@CheckReturnValue
@Immutable
@JsType
public final class SafeStyle {

  /** The SafeStyle wrapping an empty string. */
  public static final SafeStyle EMPTY = new SafeStyle("");

  private final String privateDoNotAccessOrElseSafeStyleWrappedValue;

  SafeStyle(String style) {
    if (style == null) {
      throw new NullPointerException();
    }
    privateDoNotAccessOrElseSafeStyleWrappedValue = style;
  }

  @Override
  public int hashCode() {
    return privateDoNotAccessOrElseSafeStyleWrappedValue.hashCode() ^ 0x70173910;
  }

  @Override
  public boolean equals(Object other) {
    if (!(other instanceof SafeStyle)) {
      return false;
    }
    SafeStyle that = (SafeStyle) other;
    return this.privateDoNotAccessOrElseSafeStyleWrappedValue.equals(
        that.privateDoNotAccessOrElseSafeStyleWrappedValue);
  }

  /**
   * Returns a debug representation of this value's underlying string, NOT the string representation
   * of the style declaration(s).
   *
   * <p>Having {@code toString()} return a debug representation is intentional. This type has
   * a GWT-compiled JavaScript version; JavaScript has no static typing and a distinct method
   * method name provides a modicum of type-safety.
   *
   * @see #getSafeStyleString
   */
  @Override
  public String toString() {
    return "SafeStyle{" + privateDoNotAccessOrElseSafeStyleWrappedValue + "}";
  }

  /**
   * Returns this value's underlying string. See class documentation for what guarantees exist on
   * the returned string.
   */
  // NOTE(mlourenco): jslayout depends on this exact method name when generating code, be careful if
  // changing it.
  public String getSafeStyleString() {
    return privateDoNotAccessOrElseSafeStyleWrappedValue;
  }
}
