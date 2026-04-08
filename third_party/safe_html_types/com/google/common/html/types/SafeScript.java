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
 * A string-like object which represents JavaScript code and that carries the security type
 * contract that its value, as a string, will not cause execution of unconstrained attacker
 * controlled code (XSS) when evaluated as JavaScript in a browser.
 *
 * A SafeScript's string representation ({@link #getSafeScriptString()}) can safely be interpolated
 * as the content of a script element within HTML. The SafeScript string should not be escaped
 * before interpolation.
 *
 * Note that the SafeScript might contain text that is attacker-controlled but that text should
 * have been interpolated with appropriate escaping, sanitization and/or validation into the right
 * location in the script, such that it is highly constrained in its effect (for example, it had to
 * match a set of whitelisted words).
 *
 * A SafeScript can be constructed via security-reviewed unchecked conversions. In this case
 * producers of SafeScript must ensure themselves that the SafeScript does not contain unsafe
 * script. Note in particular that {@code &lt;} is dangerous, even when inside JavaScript strings,
 * and so should always be forbidden or JavaScript escaped in user controlled input. For example,
 * if {@code &lt;/script&gt;&lt;script&gt;evil&lt;/script&gt;"} were interpolated inside a
 * JavaScript string, it would break out of the context of the original script element and
 * {@code evil} would execute. Also note that within an HTML script (raw text) element, HTML
 * character references, such as {@code &amp;lt;}, are not allowed. See
 * http://www.w3.org/TR/html5/scripting-1.html#restrictions-for-contents-of-script-elements.
 */
@CheckReturnValue
@Immutable
@JsType
public final class SafeScript {

  /** The SafeScript wrapping an empty string. */
  public static final SafeScript EMPTY = new SafeScript("");

  private final String privateDoNotAccessOrElseSafeScriptWrappedValue;

  SafeScript(String script) {
    if (script == null) {
      throw new NullPointerException();
    }
    this.privateDoNotAccessOrElseSafeScriptWrappedValue = script;
  }

  @Override
  public int hashCode() {
    return privateDoNotAccessOrElseSafeScriptWrappedValue.hashCode() ^ 0x6914dfaa;
  }

  @Override
  public boolean equals(Object other) {
    if (!(other instanceof SafeScript)) {
      return false;
    }
    SafeScript that = (SafeScript) other;
    return this.privateDoNotAccessOrElseSafeScriptWrappedValue.equals(
        that.privateDoNotAccessOrElseSafeScriptWrappedValue);
  }

  /**
   * Returns a debug representation of this value's underlying string, NOT the string representation
   * of the SafeScript.
   *
   * <p>Having {@code toString()} return a debug representation is intentional. This type has
   * a GWT-compiled JavaScript version; JavaScript has no static typing and a distinct method
   * method name provides a modicum of type-safety.
   *
   * @see #getSafeScriptString
   */
  @Override
  public String toString() {
    return "SafeScript{" + privateDoNotAccessOrElseSafeScriptWrappedValue + "}";
  }

  /**
   * Returns this value's underlying string. See class documentation for what guarantees exist on
   * the returned string.
   */
  public String getSafeScriptString() {
    return privateDoNotAccessOrElseSafeScriptWrappedValue;
  }
}
