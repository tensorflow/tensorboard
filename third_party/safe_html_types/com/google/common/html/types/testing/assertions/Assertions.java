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

package com.google.common.html.types.testing.assertions;

import com.google.common.annotations.GwtIncompatible;
import java.lang.annotation.Annotation;

/** Custom assertions for internal safe HTML types tests. */
@GwtIncompatible("Class.isAssignableFrom")
public final class Assertions {

  private Assertions() {}

  /** Annotations that imply interop with loosely-checked closure. */
  private static final Class<?>[] EXPORTABLE_CLASS_ANNOTATIONS = {
    jsinterop.annotations.JsType.class,
  };

  /**
   * Asserts that {@code klass} does not have any annotations that imply that it is exportable.
   * Classes which make use of the CompileTimeConstant annotation should never be exported as
   * Closure JS (which these annotations enable) because there would be no way to enforce the
   * annotation's semantics when the JS code gets compiled.
   *
   * <p>Note that it's still ok for them to get GWT-compiled to JS, because only other Java GWT
   * code can call them.
   */
  public static void assertClassIsNotExportable(Class<?> klass) {
    for (Class<?> annotation : EXPORTABLE_CLASS_ANNOTATIONS) {
      if (klass.isAnnotationPresent(annotation.asSubclass(Annotation.class))) {
        throw new AssertionError(
            "Class should not have annotation " + annotation.getName()
            + ", @CompileTimeConstant can be bypassed: " + klass);
      }
    }
  }
}
