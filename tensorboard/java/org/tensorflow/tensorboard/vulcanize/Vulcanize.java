// Copyright 2017 The TensorFlow Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package org.tensorflow.tensorboard.vulcanize;

import static com.google.common.base.Preconditions.checkNotNull;
import static com.google.common.base.Verify.verify;
import static com.google.common.base.Verify.verifyNotNull;
import static java.nio.charset.StandardCharsets.UTF_8;

import com.google.common.base.CharMatcher;
import com.google.common.base.Joiner;
import com.google.common.collect.Iterables;
import com.google.protobuf.TextFormat;
import io.bazel.rules.closure.Webpath;
import io.bazel.rules.closure.webfiles.BuildInfo.Webfiles;
import io.bazel.rules.closure.webfiles.BuildInfo.WebfilesSource;
import java.io.ByteArrayInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Attribute;
import org.jsoup.nodes.Comment;
import org.jsoup.nodes.DataNode;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.DocumentType;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;
import org.jsoup.parser.Parser;
import org.jsoup.parser.Tag;
import org.jsoup.select.Elements;
import org.jsoup.select.NodeVisitor;

/** Simple one-off solution for TensorBoard vulcanization. */
public final class Vulcanize {

  private static final Pattern INLINE_SOURCE_MAP_PATTERN =
      Pattern.compile("[^\"]//# sourceMappingURL=.*[^\"]");

  private static final Parser parser = Parser.htmlParser();
  private static final Map<Webpath, Path> webfiles = new HashMap<>();
  private static final Set<Webpath> alreadyInlined = new HashSet<>();
  private static final Set<String> legalese = new HashSet<>();
  private static final List<String> licenses = new ArrayList<>();
  private static final List<Webpath> stack = new ArrayList<>();
  private static Webpath outputPath;
  private static Node firstScript;
  private static Node licenseComment;

  private static final Pattern ABS_URI_PATTERN = Pattern.compile("^(?:/|[A-Za-z][A-Za-z0-9+.-]*:)");

  public static void main(String[] args) throws IOException {
    int argIdx = 0;
    Webpath inputPath = Webpath.get(args[argIdx++]);
    outputPath = Webpath.get(args[argIdx++]);
    Webpath jsPath = Webpath.get(args[argIdx++]);
    Path output = Paths.get(args[argIdx++]);
    Path jsOutput = Paths.get(args[argIdx++]);

    while (argIdx < args.length) {
      final String arg = args[argIdx++];
      if (!arg.endsWith(".pbtxt")) {
        continue;
      }
      Webfiles manifest = loadWebfilesPbtxt(Paths.get(arg));
      for (WebfilesSource src : manifest.getSrcList()) {
        webfiles.put(Webpath.get(src.getWebpath()), Paths.get(src.getPath()));
      }
    }
    stack.add(inputPath);
    Document document = parse(Files.readAllBytes(webfiles.get(inputPath)));
    transform(document);
    if (firstScript != null) {
      firstScript.before(
          new Element(Tag.valueOf("script"), firstScript.baseUri())
              .appendChild(new DataNode("var CLOSURE_NO_DEPS = true;")));
    }
    if (licenseComment != null) {
      licenseComment.attr("comment", String.format("\n%s\n", Joiner.on("\n\n").join(licenses)));
    }

    boolean shouldExtractJs = !jsPath.isEmpty();
    // Write an empty file for shasum when all scripts are extracted out.
    createFile(
        jsOutput, shouldExtractJs ? extractAndTransformJavaScript(document, jsPath) : "");
    Document normalizedDocument = getFlattenedHTML5Document(document);
    // Prevent from correcting the DOM structure and messing up the whitespace
    // in the template.
    normalizedDocument.outputSettings().prettyPrint(false);
    createFile(output, normalizedDocument.toString());
  }

  private static void createFile(Path filePath, String content) throws IOException {
    Files.write(
        filePath,
        content.getBytes(UTF_8),
        StandardOpenOption.WRITE,
        StandardOpenOption.CREATE,
        StandardOpenOption.TRUNCATE_EXISTING);
  }

  private static void transform(Node root) throws IOException {
    Node node = checkNotNull(root);
    Node newNode;
    while (true) {
      newNode = enterNode(node);
      if (node.equals(root)) {
        root = newNode;
      }
      node = newNode;
      if (node.childNodeSize() > 0) {
        node = node.childNode(0);
      } else {
        while (true) {
          newNode = leaveNode(node);
          if (node.equals(root)) {
            root = newNode;
          }
          node = newNode;
          if (node.equals(root)) {
            return;
          }
          Node next = node.nextSibling();
          if (next == null) {
            if (node.parentNode() == null) {
              return;
            }
            node = verifyNotNull(node.parentNode(), "unexpected root: %s", node);
          } else {
            node = next;
            break;
          }
        }
      }
    }
  }

  private static boolean isExternalCssNode(Node node) {
    if (node.nodeName().equals("link")
        && node.attr("rel").equals("stylesheet")
        && !node.attr("href").isEmpty()) {
      return true;
    }
    if (node.nodeName().equals("link")
        && node.attr("rel").equals("import")
        && (node.attr("type").equals("css")
            || node.attr("type").equals("text/css"))
        && !node.attr("href").isEmpty()) {
      return true;
    }
    return false;
  }

  private static Node enterNode(Node node) throws IOException {
    if (node instanceof Element) {
      String href = node.attr("href");
      if (isExternalCssNode(node)
          && !shouldIgnoreUri(href)) {
        node = visitStylesheet(node);
      } else if (node.nodeName().equals("link")
          && node.attr("rel").equals("import")) {
        // Inline HTML.
        node = visitHtmlImport(node);
      } else if (node.nodeName().equals("script")
          && !shouldIgnoreUri(node.attr("src"))
          && !node.hasAttr("jscomp-ignore")) {
        node = inlineScript(node);
      }
      rootifyAttribute(node, "href");
      rootifyAttribute(node, "src");
      rootifyAttribute(node, "action");
      rootifyAttribute(node, "assetpath");
    } else if (node instanceof Comment) {
      String text = ((Comment) node).getData();
      if (text.contains("@license")) {
        handleLicense(text);
        if (licenseComment == null) {
          licenseComment = node;
        } else {
          node = removeNode(node);
        }
      } else {
        node = removeNode(node);
      }
    }
    return node;
  }

  private static Node leaveNode(Node node) {
    if (node instanceof Document) {
      stack.remove(stack.size() - 1);
    }
    return node;
  }

  private static Node visitHtmlImport(Node node) throws IOException {
    Webpath href = me().lookup(Webpath.get(node.attr("href")));
    if (alreadyInlined.add(href)) {
      stack.add(href);
      Document subdocument = parse(Files.readAllBytes(getWebfile(href)));
      for (Attribute attr : node.attributes()) {
        subdocument.attr(attr.getKey(), attr.getValue());
      }
      return replaceNode(node, subdocument);
    } else {
      return removeNode(node);
    }
  }

  private static Node visitStylesheet(Node node) throws IOException {
    Webpath href = me().lookup(Webpath.get(node.attr("href")));
    return replaceNode(
        node,
        new Element(Tag.valueOf("style"), node.baseUri(), node.attributes())
            .appendChild(
                new DataNode(
                    new String(Files.readAllBytes(getWebfile(href)), UTF_8)))
            .removeAttr("rel")
            .removeAttr("href"));
  }

  private static Node inlineScript(Node node) throws IOException {
    Node result;
    if (node.attr("src").isEmpty()) {
      result = node;
    } else {
      Webpath href = me().lookup(Webpath.get(node.attr("src")));
      String code = new String(Files.readAllBytes(getWebfile(href)), UTF_8);
      code = code.replace("</script>", "</JAVA_SCRIIIIPT/>");
      code = INLINE_SOURCE_MAP_PATTERN.matcher(code).replaceAll("");
      result = replaceNode(
          node,
          new Element(Tag.valueOf("script"), node.baseUri(), node.attributes())
              .appendChild(new DataNode(code))
              .removeAttr("src"));
    }
    if (firstScript == null) {
      firstScript = result;
    }
    return result;
  }

  private static Node replaceNode(Node oldNode, Node newNode) {
    oldNode.replaceWith(newNode);
    return newNode;
  }

  private static Node removeNode(Node node) {
    return replaceNode(node, new TextNode(""));
  }

  private static Path getWebfile(Webpath path) {
    return verifyNotNull(webfiles.get(path), "Bad ref: %s -> %s", me(), path);
  }

  private static void handleLicense(String text) {
    if (legalese.add(CharMatcher.whitespace().removeFrom(text))) {
      licenses.add(CharMatcher.anyOf("\r\n").trimFrom(text));
    }
  }

  private static Webpath me() {
    return Iterables.getLast(stack);
  }

  private static void rootifyAttribute(Node node, String attribute) {
    String value = node.attr(attribute);
    if (value.isEmpty()) {
      return;
    }
    Webpath uri = Webpath.get(value);
    // Form absolute path from uri if uri is not an absolute path.
    // Note that webfiles is a map of absolute webpaths to relative filepaths.
    Webpath absUri = isAbsolutePath(uri)
        ? uri : me().getParent().resolve(uri).normalize();

    if (webfiles.containsKey(absUri)) {
      node.attr(attribute, outputPath.getParent().relativize(absUri).toString());
    }
  }

  /**
   * Checks whether a path is a absolute path.
   * Webpath.isAbsolute does not take data uri and other forms of absolute path into account.
   */
  private static Boolean isAbsolutePath(Webpath path) {
    return path.isAbsolute() || ABS_URI_PATTERN.matcher(path.toString()).find();
  }

  private static Document parse(byte[] bytes) {
    return parse(new ByteArrayInputStream(bytes));
  }

  private static Document parse(InputStream input) {
    Document document;
    try {
      document = Jsoup.parse(input, null, "", parser);
    } catch (IOException e) {
      throw new AssertionError("I/O error when parsing byte array D:", e);
    }
    document.outputSettings().indentAmount(0);
    document.outputSettings().prettyPrint(false);
    return document;
  }

  private static Webfiles loadWebfilesPbtxt(Path path) throws IOException {
    verify(path.toString().endsWith(".pbtxt"), "Not a pbtxt file: %s", path);
    Webfiles.Builder build = Webfiles.newBuilder();
    TextFormat.getParser().merge(new String(Files.readAllBytes(path), UTF_8), build);
    return build.build();
  }

  private static boolean shouldIgnoreUri(String uri) {
    return uri.startsWith("#")
        || uri.endsWith("/")
        || uri.contains("//")
        || uri.startsWith("data:")
        || uri.startsWith("javascript:")
        || uri.startsWith("mailto:")
        // The following are intended to filter out URLs with Polymer variables.
        || (uri.contains("[[") && uri.contains("]]"))
        || (uri.contains("{{") && uri.contains("}}"));
  }

  private static String extractScriptContent(Document document) throws IOException {
    Elements scripts = document.getElementsByTag("script");
    StringBuilder sourcesBuilder = new StringBuilder();

    for (Element script : scripts) {
      String sourceContent;
      String src = script.attr("src");
      if (src.isEmpty()) {
        sourceContent = script.html();
      } else {
        // script element that remains are the ones with src that is absolute or annotated with
        // `jscomp-ignore`. They must resolve from the root because those srcs are rootified.
        Webpath webpathSrc = Webpath.get(src);
        Webpath webpath = Webpath.get("/").resolve(webpathSrc).normalize();
        if (isAbsolutePath(webpathSrc)) {
          if (script.hasAttr("defer") || script.hasAttr("async")) {
            continue;
          }
          throw new IllegalArgumentException(
              "Script refers to a remote resource ("
                  + webpathSrc
                  + ") in a blocking way. For"
                  + " correctness of execution, please make sure it is async-able or defer-able:"
                  + script.outerHtml());
        } else if (!webfiles.containsKey(webpath)) {
          throw new FileNotFoundException(
              "Expected webfiles for " + webpath + " to exist. Related: " + script.outerHtml());
        }
        sourceContent = new String(Files.readAllBytes(webfiles.get(webpath)), UTF_8);
      }

      sourcesBuilder.append(sourceContent).append("\n");
      script.remove();
    }

    return sourcesBuilder.toString();
  }

  private static String extractAndTransformJavaScript(Document document, Webpath jsPath)
      throws IOException {
    String scriptContent = extractScriptContent(document);

    Element lastBody = Iterables.getLast(document.getElementsByTag("body"));
    Element scriptElement = new Element(Tag.valueOf("script"), "");
    scriptElement.attr("src", jsPath.removeBeginningSeparator().toString());
    lastBody.appendChild(scriptElement);

    return scriptContent;
  }

  private static void cloneChildrenWithoutWhitespace(Element src, Element dest) {
    List<Node> toMove = new ArrayList<>();
    for (Node node : src.childNodes()) {
      if (node instanceof TextNode && ((TextNode) node).isBlank()) {
        continue;
      }
      toMove.add(node);
    }
    for (Node node : toMove) {
      dest.appendChild(node.clone());
    }
  }

  /**
   * When we inline the HTML based on `<link rel="import">` in `transform`, we
   * replace the link element with parsed document. This makes us have nested
   * documents and jsoup's Node.outerHtml (or Node.toString) are incapable of
   * properly outputting that. Here, we flatten the document by combining all
   * elements in `<head>` and `<body>` of nested document in one `<head>` and
   * `<body>`.
   *
   * It also prepends <!doctype html> since TensorBoard requires that the
   * document is HTML.
   *
   * NOTE: it makes side-effect to the input `document`.
   *
   * Examples:
   * // Input
   * <#root> <!-- document -->
   *   <html>
   *     <head>
   *      <#root>
   *        <html>
   *          <head>
   *            <script></script>
   *            <#root><html><body>welcome </body></html></#root>
   *          </head>
   *          <body>foo</body></html>
   *      </#root></head>
   *     <body><span>bar</span></body>
   *   </html>
   * </html>
   * // Output
   * <#root> <!-- document -->
   *   <!doctype html>
   *   <html>
   *     <head><script></script></head>
   *     <body>welcome foo<span>bar</span></body>
   *   </html>
   * </html>
   **/
  private static Document getFlattenedHTML5Document(Document document) {
    Document flatDoc = new Document("/");

    flatDoc.appendChild(new DocumentType("html", "", ""));

    // Transfer comment nodes from the `document` level. They are important
    // license comments
    for (Node node : document.childNodes()) {
      if (node instanceof Comment) {
        flatDoc.appendChild(node.clone());
      }
    }

    // Create `<html>`, `<head>` and `<body>`.
    flatDoc.normalise();

    document.traverse(new FlatDocumentCopier(flatDoc));

    for (Element subdoc : flatDoc.getElementsByTag("#root")) {
      if (!subdoc.equals(flatDoc)) {
        final int maxElementStrLen = 200;
        String parentStr = subdoc.parent().outerHtml();
        if (parentStr.length() > maxElementStrLen) {
          parentStr = parentStr.substring(0, maxElementStrLen) + "...";
        }
        throw new RuntimeException(
            "Nested doc (e.g., <link> importing outside the head of a document) "
            + "is not supported.\nParent of offending element: " + parentStr);
      }
    }

    return flatDoc;
  }

  private static class FlatDocumentCopier implements NodeVisitor {
    private final Element destHead;
    private final Element destBody;

    public FlatDocumentCopier(Document dest) {
      destHead = dest.head();
      destBody = dest.body();
    }

    @Override
    public void head(Node node, int depth) {
      // Copy childNodes from `head` into the dest doc's head without
      // modification if the node is not a `document` (or a `<#root>` element)
      // in which case we want to traverse further and only copy the childNodes
      // in its `body` and `head` elements.
      if (node.parentNode() != null && node.parentNode().nodeName().equals("head")
          && !(node instanceof Document)) {
        destHead.appendChild(node.clone());
      }

      if (node.nodeName().equals("body")) {
        cloneChildrenWithoutWhitespace((Element) node, destBody);
        // No need to further traverse the `body`. Skip by removing the nodes.
        ((Element) node).empty();
      }
    }

    @Override
    public void tail(Node node, int depth) {
      // Copying is done during the `head`. No need to do any work.
    }
  }

  private Vulcanize() {}
}
