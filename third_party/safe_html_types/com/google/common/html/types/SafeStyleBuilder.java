// **** GENERATED CODE, DO NOT MODIFY ****
// This file was generated via preprocessing from input:
// java/com/google/common/html/types/SafeStyleBuilder.java.tpl
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
import com.google.common.base.Joiner;
import com.google.common.base.Joiner.MapJoiner;
import com.google.common.net.PercentEscaper;
import com.google.errorprone.annotations.CompileTimeConstant;

import java.util.LinkedHashMap;
import javax.annotation.CheckReturnValue;
import javax.annotation.concurrent.NotThreadSafe;

/**
 * A builder for values of type {@link SafeStyle}.
 *
 * <p>The builder allows a sequence of CSS declarations to be constructed by combining trusted
 * and untrusted values. Trusted values are passed via {@link CompileTimeConstant} strings and
 * enums. Untrusted values are passed via regular strings and are subject to runtime sanitization
 * and, if deemed unsafe, replaced by an innocuous value, {@link #INNOCUOUS_PROPERTY_STRING}.
 *
 * <p>This builder does not guarantee semantically valid CSS, only that the generated SafeStyle
 * fulfills its type contract.
 *
 * <p>This builder currently lacks support for most CSS properties, if you need support for a
 * missing one please contact safe-html-types-discuss@googlegroups.com.
 */
@NotThreadSafe @GwtCompatible
public final class SafeStyleBuilder {

  // TODO(mlourenco): Change SafeUrl to also use "JSafeHtml".
  private static final String INNOCUOUS_PROPERTY_STRING = "zJSafeHtmlzinvalid";

  private final LinkedHashMap<String, String> properties = new LinkedHashMap<String, String>();

  // TODO(mlourenco): Consider whether we want to avoid or discourage the  following asymmetry:
  // .backgroundAttachmendAppend("1", "2").backgroundImageAppendConstant("1,2")

  /**
   * Appends {@code values} to the {@code background-attachment} property. Values will be comma
   * separated.
   *
   * <p>The values must consist of only ASCII alphabetic or '-' characters. A non-conforming value
   * will be replaced with {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/background-attachment"
   */
  public SafeStyleBuilder backgroundAttachmentAppend(String value, String... otherValues) {
    appendToProperty("background-attachment", sanitizeAndJoinEnumValues(value, otherValues));
    return this;
  }

  /**
   * Sets {@code constant} as the {@code background-color} property.
   *
   * <p>Only minimal runtime validation is performed on {@code constant}; being under application
   * control, it is assumed to be valid and to not break the syntactic structure of the underlying
   * CSS (by, for example, including comment markers).
   *
   * @throws IllegalArgumentException if {@code constant} contains blacklisted characters or comment
   *     markers: '&lt;', '&gt;', '"', '\'', ';', "//", "/*" or "*&#47;"
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/background-color"
   */
  public SafeStyleBuilder backgroundColorFromConstant(@CompileTimeConstant final String constant) {
    properties.put("background-color", checkConstantValue(constant));
    return this;

  }

  /**
   * Sets {@code value} as the {@code background-color} property.
   *
   * <p>The value must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/background-color"
   */
  public SafeStyleBuilder backgroundColor(String value) {
    properties.put("background-color", sanitizeRegularValue(value));
    return this;
  }

  /**
   * Appends {@code constant} to the {@code background-image} property, if necessary inserting a
   * leading comma. Note that {@code constant} itself can contain commas, to separate multiple
   * values being set on the property. Note that since "//" is not allowed, this method cannot
   * be used to append URLs, instead use {@link #backgroundImageAppendUrl(String)}
   *
   * <p>Only minimal runtime validation is performed on {@code constant}; being under application
   * control, it is assumed to be valid and to not break the syntactic structure of the underlying
   * CSS (by, for example, including comment markers).
   *
   * @throws IllegalArgumentException if {@code constant} contains blacklisted characters or comment
   *     markers: '&lt;', '&gt;', '"', '\'', ';', "//", "/*" or "*&#47;"
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/background-image"
   */
  public SafeStyleBuilder backgroundImageAppendConstant(
      @CompileTimeConstant final String constant) {
    appendToProperty("background-image", checkConstantValue(constant));
    return this;
  }

  /**
   * Appends a {@code url} value to the {@code background-image} property, if necessary inserting
   * a leading comma. The {@code url} value will be inserted inside a {@code url} function call.
   *
   * <p>The {@code url} is validated as safe, as determined by {@link SafeUrls#sanitize(String)}.
   * It also percent-encoded to prevent it from interefering with the structure of the surrounding
   * CSS.
   *
   * <p>TODO(mlourenco): The right thing to do would be to CSS-escape but percent-encoding is
   * easier for now because we don't have a CSS-escaper. As URLs in CSS are likely to point to
   * domains we control it seems extremely unlikely that this will break anything.
   *
   * @see "http://dev.w3.org/csswg/css-backgrounds/#background-image"
   */
  public SafeStyleBuilder backgroundImageAppendUrl(String url) {
    url = SafeUrls.sanitize(url).getSafeUrlString();
    try {
      url = ESCAPER_BACKGROUND_IMAGE.escape(url);
    } catch (IllegalArgumentException e) {  // Happens if url contains invalid surrogate sequences.
      url = INNOCUOUS_PROPERTY_STRING;
    }
    String urlValue = "url(" + url + ")";
    appendToProperty("background-image", urlValue);
    return this;
  }

  /** All RFC 3986 unreserved characters. */
  private static final String UNRESERVED_CHARACTERS = "-._~";

  /**
   * Reserved characters in RFC 3986. '\'', '(' and ')' are excluded, they only appear in the
   * obsolete mark production in Appendix D.2 of RFC 3986, so they can be encoded without
   * changing semantics. ';' and ',' are excluded too since those are meta-characters in the
   * context of CSS properties and background-image, respectively.
   */
  private static final String RESERVED_CHARACTERS_BACKGROUND_IMAGE = "/:?#[]@!$&*+=";

  /**
   * Encoding '%' characters that are already part of a valid percent-encoded sequence changes the
   * semantics of a URL, and hence we need to preserve them. Note that this may allow non-encoded
   * '%' characters to remain in the URL (i.e., occurrences of '%' that are not part of a valid
   * percent-encoded sequence, for example, 'ab%xy').
   */
  private static final String OTHER_CHARACTERS = "%";

  /** Percent-encodes and UTF-16 validates, like encodeURI() in JavaScript. */
  private static final PercentEscaper ESCAPER_BACKGROUND_IMAGE = new PercentEscaper(
      UNRESERVED_CHARACTERS + RESERVED_CHARACTERS_BACKGROUND_IMAGE + OTHER_CHARACTERS, false);

  /**
   * Appends {@code values} to the {@code background-size} property. Values will be comma
   * separated.
   *
   * <p>All values must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/background-size"
   */
  public SafeStyleBuilder backgroundSizeAppend(String value, String... otherValues) {
    appendToProperty("background-size", sanitizeAndJoinRegularValues(value, otherValues));
    return this;
  }

  /**
   * Sets {@code value} as the {@code border} property.
   *
   * <p>The value must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/border"
   */
  public SafeStyleBuilder border(String value) {
    properties.put("border", sanitizeRegularValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code border-top} property.
   *
   * <p>The value must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/border-top"
   */
  public SafeStyleBuilder borderTop(String value) {
    properties.put("border-top", sanitizeRegularValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code border-bottom} property.
   *
   * <p>The value must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/border-bottom"
   */
  public SafeStyleBuilder borderBottom(String value) {
    properties.put("border-bottom", sanitizeRegularValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code border-right} property.
   *
   * <p>The value must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/border-right"
   */
  public SafeStyleBuilder borderRight(String value) {
    properties.put("border-right", sanitizeRegularValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code border-left} property.
   *
   * <p>The value must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/border-left"
   */
  public SafeStyleBuilder borderLeft(String value) {
    properties.put("border-left", sanitizeRegularValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code bottom} property.
   *
   * <p>The value must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/bottom"
   */
  public SafeStyleBuilder bottom(String value) {
    properties.put("bottom", sanitizeRegularValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code padding} property.
   *
   * <p>The value must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/padding"
   */
  public SafeStyleBuilder padding(String value) {
    properties.put("padding", sanitizeRegularValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code margin} property.
   *
   * <p>The value must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/margin"
   */
  public SafeStyleBuilder margin(String value) {
    properties.put("margin", sanitizeRegularValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code float} property.
   *
   *<p>The values must consist of only ASCII alphabetic or '-' characters. A non-conforming value
   * will be replaced with {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/float"
   */
  public SafeStyleBuilder setFloat(String value) {
    properties.put("float", sanitizeEnumValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code display} property.
   *
   * <p>The values must consist of only ASCII alphabetic or '-' characters. A non-conforming value
   * will be replaced with {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/display"
   */
  public SafeStyleBuilder display(String value) {
    properties.put("display", sanitizeEnumValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code background-repeat} property
   *
   * <p>The value must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/background-repeat"
   */
  public SafeStyleBuilder backgroundRepeat(String value) {
    properties.put("background-repeat", sanitizeRegularValue(value));
    return this;
  }

  /**
   * Sets {@code constant} as the {@code border-color} property.
   *
   * <p>Only minimal runtime validation is performed on {@code constant}; being under application
   * control, it is assumed to be valid and to not break the syntactic structure of the underlying
   * CSS (by, for example, including comment markers).
   *
   * @throws IllegalArgumentException if {@code constant} contains blacklisted characters or comment
   *     markers: '&lt;', '&gt;', '"', '\'', ';', "//", "/*" or "*&#47;"
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/border-color"
   */
  public SafeStyleBuilder borderColorFromConstant(@CompileTimeConstant final String constant) {
    properties.put("border-color", checkConstantValue(constant));
    return this;

  }

  /**
   * Sets {@code value} as the {@code border-color} property.
   *
   * <p>The value must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/border-color"
   */
  public SafeStyleBuilder borderColor(String value) {
    properties.put("border-color", sanitizeRegularValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code border-collapse} property.
   *
   * <p>The values must consist of only ASCII alphabetic or '-' characters. A non-conforming value
   * will be replaced with {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/border-collapse"
   */
  public SafeStyleBuilder borderCollapse(String value) {
    properties.put("border-collapse", sanitizeEnumValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code color} property.
   *
   * <p>The value must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/color"
   */
  public SafeStyleBuilder color(String value) {
    properties.put("color", sanitizeRegularValue(value));
    return this;
  }

  /**
   * Appends {@code values} to the {@code font-family} property. Values will be comma separated.
   *
   * <p>If a value consists only of only ASCII alphabetic or '-' characters, it is appended as is,
   * since it might be a generic font family (like {@code serif}) which must not be quoted. If a
   * value contains other characters it will be quoted, since quoting might be required (for
   * example, if the font name contains a space) and unnecessary quoting is allowed.
   *
   * <p>Values must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/font-family"
   */
  public SafeStyleBuilder fontFamilyAppend(String value, String... otherValues) {
    sanitizeAndAppendToFontFamily(value);
    for (String otherValue : otherValues) {
      sanitizeAndAppendToFontFamily(otherValue);
    }
    return this;
  }

  private void sanitizeAndAppendToFontFamily(String value) {
    if (isEnumValue(value)) {
      appendToProperty("font-family", value);
    } else if (isRegularValue(value)) {
      appendToProperty("font-family", "\"" + value + "\"");
    } else {
      appendToProperty("font-family", INNOCUOUS_PROPERTY_STRING);
    }
  }

  /**
   * Sets {@code value} as the {@code height} property.
   *
   * <p>The value must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/height"
   */
  public SafeStyleBuilder height(String value) {
    properties.put("height", sanitizeRegularValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code background-position} property.
   *
   * <p>The value must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/background-position"
   */
  public SafeStyleBuilder backgroundPosition(String value) {
    properties.put("background-position", sanitizeRegularValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code left} property.
   *
   * <p>The value must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/left"
   */
  public SafeStyleBuilder left(String value) {
    properties.put("left", sanitizeRegularValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code line-height} property.
   *
   * <p>The value must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/line-height"
   */
  public SafeStyleBuilder lineHeight(String value) {
    properties.put("line-height", sanitizeRegularValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code overflow} property.
   *
   * <p>The values must consist of only ASCII alphabetic or '-' characters. A non-conforming value
   * will be replaced with {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/overflow"
   */
  public SafeStyleBuilder overflow(String value) {
    properties.put("overflow", sanitizeEnumValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code overflow-x} property.
   *
   * <p>The values must consist of only ASCII alphabetic or '-' characters. A non-conforming value
   * will be replaced with {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/overflow"
   */
  public SafeStyleBuilder overflowX(String value) {
    properties.put("overflow-x", sanitizeEnumValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code overflow-y} property.
   *
   * <p>The values must consist of only ASCII alphabetic or '-' characters. A non-conforming value
   * will be replaced with {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/overflow"
   */
  public SafeStyleBuilder overflowY(String value) {
    properties.put("overflow-y", sanitizeEnumValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code text-align} property.
   *
   * <p>The values must consist of only ASCII alphabetic or '-' characters. A non-conforming value
   * will be replaced with {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/text-align"
   */
  public SafeStyleBuilder textAlign(String value) {
    properties.put("text-align", sanitizeEnumValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code right} property.
   *
   * <p>The value must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/right"
   */
  public SafeStyleBuilder right(String value) {
    properties.put("right", sanitizeRegularValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code top} property.
   *
   * <p>The value must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/top"
   */
  public SafeStyleBuilder top(String value) {
    properties.put("top", sanitizeRegularValue(value));
    return this;
  }

  /**
   * Sets {@code value} as the {@code width} property.
   *
   * <p>The value must contain only whitelisted characters; those are alphanumerics, space,
   * tab, and the set {@code [+-.!#%_/*]}. In addition, comment markers - {@code //}, {@code /*},
   * and <code>*&#47;</code>- are disallowed too. Non-conforming values are replaced with
   * {@link #INNOCUOUS_PROPERTY_STRING}.
   *
   * @see "https://developer.mozilla.org/en-US/docs/Web/CSS/width"
   */
  public SafeStyleBuilder width(String value) {
    properties.put("width", sanitizeRegularValue(value));
    return this;
  }

  @CheckReturnValue
  public SafeStyle build() {
    StringBuilder sb = new StringBuilder();
    if (!properties.isEmpty()) {
      // SafeStyle contract requires a trailing ';'.
      JOINER.appendTo(sb, properties).append(";");
    }
    return SafeStyles.create(sb.toString());
  }

  private static final MapJoiner JOINER = Joiner.on(";").withKeyValueSeparator(":");

  private void appendToProperty(String property, String safeValue) {
    if (properties.containsKey(property)) {
      // LinkedHashMap maintains initial insertion order when an item is reinserted.
      properties.put(property, properties.get(property) + "," + safeValue);
    } else {
      properties.put(property, safeValue);
    }
  }

  /**
   * Throws IllegalArgumentException if {@code value} contains any of a few blacklisted characters
   * which would change the syntactic structure of the CSS or entirely break out of the HTML style
   * attribute.
   */
  private static String checkConstantValue(@CompileTimeConstant final String value) {
    for (int i = 0; i < value.length(); i++) {
      char c = value.charAt(i);
      if (c == '<' || c == '>' || c == '"' || c == '\'' || c == ';') {
        throw new IllegalArgumentException(
            "Value contains HTML/CSS meta-characters ([<>\"';]): " + value);
      } else if (
            value.startsWith("/*", i) || value.startsWith("*/", i) || value.startsWith("//", i)) {
          throw new IllegalArgumentException(
              "Value contains CSS comment marker (/*, */ or //): " + value);
      }
    }
    return value;
  }

  /**
   * Sanitizes and joins string varargs where each value is subjected to sanitization via
   * {@link #sanitizeEnumValue(String)}.
   */
  private static String sanitizeAndJoinEnumValues(String value, String[] otherValues) {
    StringBuilder sb = new StringBuilder(sanitizeEnumValue(value));
    for (int i = 0; i < otherValues.length; i++) {
      sb.append(',').append(sanitizeEnumValue(otherValues[i]));
    }
    return sb.toString();
  }

  /**
   * Sanitizes and joins string varargs where each value is subjected to sanitization via
   * {@link #sanitizeRegularValue(String)}.
   */
  private static String sanitizeAndJoinRegularValues(String value, String[] otherValues) {
    StringBuilder sb = new StringBuilder(sanitizeRegularValue(value));
    for (int i = 0; i < otherValues.length; i++) {
      sb.append(',').append(sanitizeRegularValue(otherValues[i]));
    }
    return sb.toString();
  }

  /**
   * For properties that can only be set to an enum we just allow alphabetic and '-' characters.
   */
  private static String sanitizeEnumValue(String value) {
    if (isEnumValue(value)) {
      return value;
    } else {
      return INNOCUOUS_PROPERTY_STRING;
    }
  }

  private static boolean isEnumValue(String value) {
    if (value.isEmpty()) {
      return false;
    }
    for (int i = 0; i < value.length(); i++) {
      char c = value.charAt(i);
      if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '-')) {
        return false;
      }
    }
    return true;
  }

  /**
   * This method implements the same logic as jslayout's CSS sanitizer for "regular" properties,
   * except that commas are not whitelisted here, as they could be used inject extra values into
   * a property.
   *
   * <ol>
   * <li>Escape sequences and comments are not allowed. While "//" is not a comment marker in the
   * CSS spec, we disallow it as well. This restrictiveness minimizes the chance that browser
   * peculiarities, or bugs, parsing these complex sequences will let sanitization be bypassed.
   * <li>'(' and ')' which can be used to call functions are also disallowed.
   * <li>Characters which could be matched on CSS error recovery
   * (http://www.w3.org/TR/css3-syntax/#error-handling) of a previously malformed token, like '@'
   * and ':' are not present.
   * </ol>
   */
  private static String sanitizeRegularValue(String value) {
    if (isRegularValue(value)) {
      return value;
    } else {
      return INNOCUOUS_PROPERTY_STRING;
    }
  }

  private static boolean isRegularValue(String value) {
    boolean hasNonWhitespace = false;
    for (int i = 0; i < value.length(); i++) {
      char c = value.charAt(i);
      if (value.startsWith("/*", i) || value.startsWith("*/", i) || value.startsWith("//", i)) {
        return false;
      } else if (c == ' ' || c == '\t') {
        continue;
      } else if (c == '/' || c == '*' || c == '+' || c == '-' || c == '.' || c == '!' || c == '#'
          || c == '%' || c == '_') {
        hasNonWhitespace = true;
        continue;
      } else if ((c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')) {
        hasNonWhitespace = true;
        continue;
      } else {
        return false;
      }
    }
    return hasNonWhitespace;
  }
}
