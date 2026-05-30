// **** GENERATED CODE, DO NOT MODIFY ****
// This file was generated via preprocessing from input:
// java/com/google/common/html/types/testing/HtmlConversions.java.tpl
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

package com.google.common.html.types.testing;

import com.google.common.annotations.GwtCompatible;
import com.google.common.html.types.SafeHtml;
import com.google.common.html.types.SafeHtmlProto;
import com.google.common.html.types.SafeHtmls;
import com.google.common.html.types.SafeScript;
import com.google.common.html.types.SafeScriptProto;
import com.google.common.html.types.SafeScripts;
import com.google.common.html.types.SafeStyle;
import com.google.common.html.types.SafeStyleProto;
import com.google.common.html.types.SafeStyleSheet;
import com.google.common.html.types.SafeStyleSheetProto;
import com.google.common.html.types.SafeStyleSheets;
import com.google.common.html.types.SafeStyles;
import com.google.common.html.types.SafeUrl;
import com.google.common.html.types.SafeUrlProto;
import com.google.common.html.types.SafeUrls;
import com.google.common.html.types.TrustedResourceUrl;
import com.google.common.html.types.TrustedResourceUrlProto;
import com.google.common.html.types.TrustedResourceUrls;
import com.google.common.html.types.UncheckedConversions;

/**
 * Static utilities to create arbitrary values of safe HTML-related types for use by tests only.
 * Note that created instances may violate type contracts.
 *
 * <p>These methods are useful when types are constructed in a manner where using the production
 * API is too inconvenient. Please do use the production API whenever possible; there is value in
 * having tests reflect common usage. Using the production API also avoids, by design, non-contract
 * complying instances from being created.
 */
@GwtCompatible
public final class HtmlConversions {

  private HtmlConversions() {}

  /**
   * Creates a {@link SafeHtml} wrapping the given {@code string}. No validation is performed.
   *
   * <p>If possible please use the production API in
   * {@link com.google.common.html.types.SafeHtmls}
   * instead.
   */
  public static SafeHtml newSafeHtmlForTest(String string) {
    return UncheckedConversions.safeHtmlFromStringKnownToSatisfyTypeContract(string);
  }

  /**
   * Creates a {@link SafeHtmlProto} wrapping the given {@code string}. No validation is performed.
   *
   * <p>If possible please use the production API in
   * {@link com.google.common.html.types.SafeHtmls}
   * instead.
   */
  public static SafeHtmlProto newSafeHtmlProtoForTest(String string) {
    return SafeHtmls.toProto(newSafeHtmlForTest(string));
  }

  /**
   * Creates a {@link SafeScript} wrapping the given {@code string}. No validation is performed.
   *
   * <p>If possible please use the production API in
   * {@link com.google.common.html.types.SafeScripts}
   * instead.
   */
  public static SafeScript newSafeScriptForTest(String string) {
    return UncheckedConversions.safeScriptFromStringKnownToSatisfyTypeContract(string);
  }

  /**
   * Creates a {@link SafeScriptProto} wrapping the given {@code string}. No validation is
   * performed.
   *
   * <p>If possible please use the production API in
   * {@link com.google.common.html.types.SafeScripts}
   * instead.
   */
  public static SafeScriptProto newSafeScriptProtoForTest(String string) {
    return SafeScripts.toProto(newSafeScriptForTest(string));
  }

  /**
   * Creates a {@link SafeStyle} wrapping the given {@code string}. No validation is performed.
   *
   * <p>If possible please use the production API in
   * {@link com.google.common.html.types.SafeStyles}
   * instead.
   */
  public static SafeStyle newSafeStyleForTest(String string) {
    return UncheckedConversions.safeStyleFromStringKnownToSatisfyTypeContract(string);
  }

  /**
   * Creates a {@link SafeStyleProto} wrapping the given {@code string}. No validation is performed.
   *
   * <p>If possible please use the production API in
   * {@link com.google.common.html.types.SafeStyles}
   * instead.
   */
  public static SafeStyleProto newSafeStyleProtoForTest(String string) {
    return SafeStyles.toProto(newSafeStyleForTest(string));
  }

  /**
   * Creates a {@link SafeStyleSheet} wrapping the given {@code string}. No validation is performed.
   *
   * <p>If possible please use the production API in
   * {@link com.google.common.html.types.SafeStyleSheets}
   * instead.
   */
  public static SafeStyleSheet newSafeStyleSheetForTest(String string) {
    return UncheckedConversions.safeStyleSheetFromStringKnownToSatisfyTypeContract(string);
  }

  /**
   * Creates a {@link SafeStyleSheetProto} wrapping the given {@code string}. No validation is
   * performed.
   *
   * <p>If possible please use the production API in
   * {@link com.google.common.html.types.SafeStyleSheets}
   * instead.
   */
  public static SafeStyleSheetProto newSafeStyleSheetProtoForTest(String string) {
    return SafeStyleSheets.toProto(newSafeStyleSheetForTest(string));
  }

  /**
   * Creates a {@link SafeUrl} wrapping the given {@code string}. No validation is performed.
   *
   * <p>If possible please use the production API in
   * {@link com.google.common.html.types.SafeUrls}
   * instead.
   */
  public static SafeUrl newSafeUrlForTest(String string) {
    return UncheckedConversions.safeUrlFromStringKnownToSatisfyTypeContract(string);
  }

 /**
   * Creates a {@link SafeUrlProto} wrapping the given {@code string}. No validation is performed.
   *
   * <p>If possible please use the production API in
   * {@link com.google.common.html.types.SafeUrls}
   * instead.
   */
  public static SafeUrlProto newSafeUrlProtoForTest(String string) {
    return SafeUrls.toProto(newSafeUrlForTest(string));
  }

  /**
   * Creates a {@link TrustedResourceUrl} wrapping the given {@code string}. No validation is
   * performed.
   *
   * <p>If possible please use the production API in
   * {@link com.google.common.html.types.TrustedResourceUrls}
   * instead.
   */
  public static TrustedResourceUrl newTrustedResourceUrlForTest(String string) {
    return UncheckedConversions.trustedResourceUrlFromStringKnownToSatisfyTypeContract(string);
  }

  /**
   * Creates a {@link TrustedResourceUrlProto} wrapping the given {@code string}. No validation is
   * performed.
   *
   * <p>If possible please use the production API in
   * {@link com.google.common.html.types.TrustedResourceUrls}
   * instead.
   */
  public static TrustedResourceUrlProto newTrustedResourceUrlProtoForTest(String string) {
    return TrustedResourceUrls.toProto(newTrustedResourceUrlForTest(string));
  }
}
