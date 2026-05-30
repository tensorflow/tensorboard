// **** GENERATED CODE, DO NOT MODIFY ****
// This file was generated via preprocessing from input:
// java/com/google/common/html/types/TrustedResourceUrlBuilder.java.tpl
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
import javax.annotation.concurrent.NotThreadSafe;

/**
 * Builder for constructing {@link TrustedResourceUrl} in steps, from application-controlled
 * strings.
 *
 * @see TrustedResourceUrl
 */
@NotThreadSafe @GwtCompatible(emulated = true)
public final class TrustedResourceUrlBuilder {
  private final StringBuilder url = new StringBuilder();

  /**
   * Creates a new builder, with an empty underlying URL.
   */
  public TrustedResourceUrlBuilder() {}

  /**
   * Creates a new builder, with an underlying URL set to the given compile-time constant
   * {@code string}.
   *
   * <p>No runtime validation or sanitization is performed on {@code string}; being under
   * application control, it is simply assumed to comply with the TrustedResourceUrl contract.
   */
  public TrustedResourceUrlBuilder(@CompileTimeConstant final String string) {
    url.append(string);
  }

  /**
   * Appends the compile-time constant {@code string} to the URL being built.
   *
   * <p>No runtime validation or sanitization is performed on {@code string}; being under
   * application control, it is simply assumed comply with the TrustedResourceUrl contract.
   */
  public TrustedResourceUrlBuilder append(@CompileTimeConstant final String string) {
    url.append(string);
    return this;
  }

  /**
   * Returns the TrustedResourceUrl built so far.
   */
  @CheckReturnValue
  public TrustedResourceUrl build() {
    return TrustedResourceUrls.create(url.toString());
  }
}
