// **** GENERATED CODE, DO NOT MODIFY ****
// This file was generated via preprocessing from input:
// java/com/google/common/html/types/SafeScripts.java.tpl
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
import javax.annotation.CheckReturnValue;


/**
 * Protocol conversions and factory methods for {@link SafeScript}.
 */
@CheckReturnValue
@GwtCompatible(emulated = true)
public final class SafeScripts {

  private SafeScripts() {}

  /**
   * Creates a SafeScript from the given compile-time constant string {@code script}.
   */
  public static SafeScript fromConstant(@CompileTimeConstant final String script) {
    if (script.length() == 0) {
      return SafeScript.EMPTY;
    }
    return create(script);
  }

  /**
   * Creates a SafeScript from the given compile-time constant {@code resourceName} using the given
   * {@code charset}.
   *
   * <p>This performs ZERO VALIDATION of the data. We assume that resources should be safe because
   * they are part of the binary, and therefore not attacker controlled.
   *
   * @param contextClass Class relative to which to load the resource.
   */
  @GwtIncompatible("Resources")
  public static SafeScript fromResource(
      Class<?> contextClass, @CompileTimeConstant final String resourceName, Charset charset)
      throws IOException {
    return create(Resources.toString(Resources.getResource(contextClass, resourceName), charset));
  }

  /**
   * Deserializes a SafeScriptProto into a SafeScript instance.
   *
   * <p>Protocol-message forms are intended to be opaque. The fields of the protocol message should
   * be considered encapsulated and are not intended for direct inspection or manipulation. Protocol
   * message forms of this type should be produced by {@link #toProto(SafeScript)} or its equivalent
   * in other implementation languages.
   *
   * <p><b>Important:</b> It is unsafe to invoke this method on a protocol message that has been
   * received from an entity outside the application's trust domain. Data coming from the browser
   * is outside the application's trust domain.
   */
  public static SafeScript fromProto(SafeScriptProto proto) {
    return create(proto.getPrivateDoNotAccessOrElseSafeScriptWrappedValue());
  }

  /**
   * Serializes a SafeScript into its opaque protocol message representation.
   *
   * <p>Protocol message forms of this type are intended to be opaque. The fields of the returned
   * protocol message should be considered encapsulated and are not intended for direct inspection
   * or manipulation. Protocol messages can be converted back into a SafeScript using
   * {@link #fromProto(SafeScriptProto)}.
   */
  public static SafeScriptProto toProto(SafeScript script) {
    return SafeScriptProto.newBuilder()
        .setPrivateDoNotAccessOrElseSafeScriptWrappedValue(script.getSafeScriptString()).build();
  }

  static SafeScript create(String script) {
    return new SafeScript(script);
  }
}
