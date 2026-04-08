// **** GENERATED CODE, DO NOT MODIFY ****
// This file was generated via preprocessing from input:
// java/com/google/common/html/types/SafeStyles.java.tpl
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
import com.google.errorprone.annotations.CompileTimeConstant;

import javax.annotation.CheckReturnValue;

/**
 * Protocol conversions and factory methods for {@link SafeStyle}.
 */
@CheckReturnValue
@GwtCompatible
public final class SafeStyles {

  private SafeStyles() {}

  /**
   * Creates a SafeStyle from the given compile-time constant string {@code style}.
   *
   * <p>{@code style} should be in the format {@code name: value; [name: value; ...]} and must
   * not have any &lt; or &gt; characters in it. This is so that SafeStyle's contract is preserved,
   * allowing the SafeStyle to correctly be interpreted as a sequence of CSS declarations and
   * without affecting the syntactic structure of any surrounding CSS and HTML.
   *
   * <p>This method performs basic sanity checks on the format of {@code style} but does not
   * constrain the format of {@code name} and {@code value}, except for disallowing tag characters.
   *
   * @throws IllegalArgumentException if some of the constraints of the format specified above
   *     are not met
   */
  public static SafeStyle fromConstant(@CompileTimeConstant final String style) {
    if (style.length() == 0) {
      return SafeStyle.EMPTY;
    }
    for (int i = 0; i < style.length(); i++) {
      if (style.charAt(i) == '<' || style.charAt(i) == '>') {
        throw new IllegalArgumentException("Forbidden characters in style string: " + style);
      }
    }
    if (style.charAt(style.length() - 1) != ';') {
      throw new IllegalArgumentException("Last character of style string is not ';': " + style);
    }
    if (!style.contains(":")) {
      throw new IllegalArgumentException("Style string must contain at least one ':', to "
        + "specify a \"name: value\" pair: " + style);
    }
    return create(style);
  }

  /**
   * Deserializes a SafeStyleProto into a SafeStyle instance.
   *
   * <p>Protocol-message forms are intended to be opaque. The fields of the protocol message should
   * be considered encapsulated and are not intended for direct inspection or manipulation. Protocol
   * message forms of this type should be produced by {@link #toProto(SafeStyle)} or its equivalent
   * in other implementation languages.
   *
   * <p><b>Important:</b> It is unsafe to invoke this method on a protocol message that has been
   * received from an entity outside the application's trust domain. Data coming from the browser
   * is outside the application's trust domain.
   */
  public static SafeStyle fromProto(SafeStyleProto proto) {
    return create(proto.getPrivateDoNotAccessOrElseSafeStyleWrappedValue());
  }

  /**
   * Serializes a SafeStyle into its opaque protocol message representation.
   *
   * <p>Protocol message forms of this type are intended to be opaque. The fields of the returned
   * protocol message should be considered encapsulated and are not intended for direct inspection
   * or manipulation. Protocol messages can be converted back into a SafeStyle using
   * {@link #fromProto(SafeStyleProto)}.
   */
  public static SafeStyleProto toProto(SafeStyle style) {
    return SafeStyleProto.newBuilder()
        .setPrivateDoNotAccessOrElseSafeStyleWrappedValue(style.getSafeStyleString()).build();
  }

  static SafeStyle create(String style) {
    return new SafeStyle(style);
  }
}
