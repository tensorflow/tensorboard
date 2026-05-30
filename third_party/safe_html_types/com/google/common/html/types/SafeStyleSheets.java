// **** GENERATED CODE, DO NOT MODIFY ****
// This file was generated via preprocessing from input:
// java/com/google/common/html/types/SafeStyleSheets.java.tpl
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
import com.google.common.annotations.GwtIncompatible;
import com.google.common.io.Resources;
import com.google.errorprone.annotations.CompileTimeConstant;

import java.io.IOException;
import java.nio.charset.Charset;
import java.util.Arrays;
import javax.annotation.CheckReturnValue;

/**
 * Protocol conversions and factory methods for {@link SafeStyleSheet}.
 */
@CheckReturnValue
@GwtCompatible(emulated = true)
public final class SafeStyleSheets {

  private SafeStyleSheets() {}

  /**
   * Creates a SafeStyleSheet from the given compile-time constant string {@code style}.
   *
   * <p>{@code styleSheet} must not have any &lt; characters in it so that the syntactic
   * structure of any surrounding CSS and HTML is not affected.
   *
   * @throws IllegalArgumentException if {@code styleSheet} contains &lt;
   */
  public static SafeStyleSheet fromConstant(@CompileTimeConstant final String styleSheet) {
    if (styleSheet.length() == 0) {
      return SafeStyleSheet.EMPTY;
    }
    for (int i = 0; i < styleSheet.length(); i++) {
      if (styleSheet.charAt(i) == '<') {
        throw new IllegalArgumentException(
            "Forbidden '<' character in style sheet string: " + styleSheet);
      }
    }
    return create(styleSheet);
  }

  /**
   * Creates a SafeStyleSheet from the given compile-time constant {@code resourceName} using
   * the given {@code charset}.
   *
   * <p>This performs ZERO VALIDATION of the data. We assume that resources should be safe because
   * they are part of the binary, and therefore not attacker controlled.
   *
   * @param contextClass Class relative to which to load the resource.
   */
  @GwtIncompatible("Resources")
  public static SafeStyleSheet fromResource(
      Class<?> contextClass, @CompileTimeConstant final String resourceName, Charset charset)
      throws IOException {
    return create(Resources.toString(Resources.getResource(contextClass, resourceName), charset));
  }


  /**
   * Deserializes a SafeStyleSheetProto into a SafeStyleSheet instance.
   *
   * <p>Protocol-message forms are intended to be opaque. The fields of the protocol message should
   * be considered encapsulated and are not intended for direct inspection or manipulation. Protocol
   * message forms of this type should be produced by {@link #toProto(SafeStyleSheet)} or its
   * equivalent in other implementation languages.
   *
   * <p><b>Important:</b> It is unsafe to invoke this method on a protocol message that has been
   * received from an entity outside the application's trust domain. Data coming from the browser
   * is outside the application's trust domain.
   */
  public static SafeStyleSheet fromProto(SafeStyleSheetProto proto) {
    return create(proto.getPrivateDoNotAccessOrElseSafeStyleSheetWrappedValue());
  }

  /**
   * Serializes a SafeStyleSheet into its opaque protocol message representation.
   *
   * <p>Protocol message forms of this type are intended to be opaque. The fields of the returned
   * protocol message should be considered encapsulated and are not intended for direct inspection
   * or manipulation. Protocol messages can be converted back into a SafeStyleSheet using
   * {@link #fromProto(SafeStyleSheetProto)}.
   */
  public static SafeStyleSheetProto toProto(SafeStyleSheet style) {
    return SafeStyleSheetProto.newBuilder()
        .setPrivateDoNotAccessOrElseSafeStyleSheetWrappedValue(
            style.getSafeStyleSheetString())
        .build();
  }

  /**
   * Creates a new SafeStyleSheet which contains, in order, the string representations of the given
   * {@code stylesheets}.
   */
  public static SafeStyleSheet concat(SafeStyleSheet... stylesheets) {
    return concat(Arrays.asList(stylesheets));
  }

  /**
   * Creates a new SafeStyleSheet which contains, in order, the string representations of the given
   * {@code stylesheets}.
   */
  public static SafeStyleSheet concat(Iterable<SafeStyleSheet> stylesheets) {
    int concatLength = 0;
    for (SafeStyleSheet stylesheet : stylesheets) {
      concatLength += stylesheet.getSafeStyleSheetString().length();
    }

    StringBuilder result = new StringBuilder(concatLength);
    for (SafeStyleSheet stylesheet : stylesheets) {
      result.append(stylesheet.getSafeStyleSheetString());
    }
    return create(result.toString());
  }

  static SafeStyleSheet create(String style) {
    return new SafeStyleSheet(style);
  }
}
