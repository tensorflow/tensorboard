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
 * A URL which is under application control and from which script, CSS, and other resources that
 * represent executable code, can be fetched.
 *
 * <p>Given that the URL can only be constructed from strings under application control and is used
 * to load resources, bugs resulting in a malformed URL should not have a security impact and are
 * likely to be easily detectable during testing. Given the wide number of non-RFC compliant URLs
 * in use, stricter validation could prevent some applications from being able to use this class.
 */
@CheckReturnValue
@Immutable
@JsType
public final class TrustedResourceUrl {

  private final String privateDoNotAccessOrElseTrustedResourceUrlWrappedValue;

  TrustedResourceUrl(String url) {
    if (url == null) {
      throw new NullPointerException();
    }
    privateDoNotAccessOrElseTrustedResourceUrlWrappedValue = url;
  }

  @Override
  public int hashCode() {
    return privateDoNotAccessOrElseTrustedResourceUrlWrappedValue.hashCode() ^ 0x6bdadb21;
  }

  @Override
  public boolean equals(Object other) {
    if (!(other instanceof TrustedResourceUrl)) {
      return false;
    }
    TrustedResourceUrl that = (TrustedResourceUrl) other;
    return this.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue.equals(
        that.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue);
  }

  /**
   * Returns a debug representation of this value's underlying string, NOT the string representation
   * of the URL.
   *
   * <p>Having {@code toString()} return a debug representation is intentional. This type has
   * a GWT-compiled JavaScript version; JavaScript has no static typing and a distinct method
   * method name provides a modicum of type-safety.
   *
   * @see #getTrustedResourceUrlString
   */
  @Override
  public String toString() {
    return "TrustedResourceUrl{" + privateDoNotAccessOrElseTrustedResourceUrlWrappedValue + "}";
  }

  /**
   * Returns this value's underlying string. See class documentation for what guarantees exist on
   * the returned string.
   */
  // NOTE(mlourenco): jslayout depends on this exact method name when generating code, be careful if
  // changing it.
  public String getTrustedResourceUrlString() {
    return privateDoNotAccessOrElseTrustedResourceUrlWrappedValue;
  }
}
