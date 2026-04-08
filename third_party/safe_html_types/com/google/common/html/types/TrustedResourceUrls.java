// **** GENERATED CODE, DO NOT MODIFY ****
// This file was generated via preprocessing from input:
// java/com/google/common/html/types/TrustedResourceUrls.java.tpl
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
import com.google.errorprone.annotations.CompileTimeConstant;

import javax.annotation.CheckReturnValue;
import javax.annotation.Nullable;

/**
 * Protocol conversions and factory methods for {@link TrustedResourceUrl}.
 */
@CheckReturnValue
@GwtCompatible(emulated = true)
public final class TrustedResourceUrls {

  private TrustedResourceUrls() {}

  /**
   * Deserializes a TrustedResourceUrlProto into a TrustedResourceUrl instance.
   *
   * <p>Protocol-message forms are intended to be opaque. The fields of the protocol message should
   * be considered encapsulated and are not intended for direct inspection or manipulation. Protocol
   * message forms of this type should be produced by {@link #toProto(TrustedResourceUrl)} or its
   * equivalent in other implementation languages.
   *
   * <p><b>Important:</b> It is unsafe to invoke this method on a protocol message that has been
   * received from an entity outside the application's trust domain. Data coming from the browser
   * is outside the application's trust domain.
   */
  public static TrustedResourceUrl fromProto(TrustedResourceUrlProto proto) {
    return create(proto.getPrivateDoNotAccessOrElseTrustedResourceUrlWrappedValue());
  }

  /**
   * Serializes a TrustedResourceUrl into its opaque protocol message representation.
   *
   * <p>Protocol message forms of this type are intended to be opaque. The fields of the returned
   * protocol message should be considered encapsulated and are not intended for direct inspection
   * or manipulation. Protocol messages can be converted back into a TrustedResourceUrl using
   * {@link #fromProto(TrustedResourceUrlProto)}.
   */
  public static TrustedResourceUrlProto toProto(TrustedResourceUrl url) {
    return TrustedResourceUrlProto.newBuilder()
        .setPrivateDoNotAccessOrElseTrustedResourceUrlWrappedValue(
            url.getTrustedResourceUrlString())
        .build();
  }

  /**
   * Creates a TrustedResourceUrl from the given compile-time constant string {@code url}.
   *
   * <p>No runtime validation or sanitization is performed on {@code url}; being under application
   * control, it is simply assumed to comply with the TrustedResourceUrl contract.
   */
  public static TrustedResourceUrl fromConstant(@CompileTimeConstant final String url) {
    return create(url);
  }

  /**
   * Creates a {@link TrustedResourceUrl} from the value of an environment variable. In a server
   * setting, environment variables are part of the application's deployment configuration and are
   * hence considered application-controlled. If the variable is not defined returns null.
   *
   *
   * <p>No runtime validation or sanitization is performed on the value of the environment variable;
   * being under application control, it is simply assumed to comply with the TrustedResourceUrl
   * contract.
   *
   * @throws SecurityException  if a security manager exists and its checkPermission method doesn't
   *     allow access to the environment variable name
   */
  @GwtIncompatible("System.getEnv")
  @Nullable
  public static TrustedResourceUrl fromEnvironmentVariable(
      @CompileTimeConstant final String variableName) {
    String var = System.getenv(variableName);
    if (var == null) {
      return null;
    }
    return create(var);
  }


  /** Also called from TrustedResourceUrlBuilder. */
  static TrustedResourceUrl create(String url) {
    return new TrustedResourceUrl(url);
  }
}
