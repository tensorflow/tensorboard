import * as ts from 'typescript';
import * as path from 'path';
import {Exporter, fs, renameExt, getPreamble} from './helper';
import {Node, findScripts} from './html-helper';
import {updateSource} from './ts-helper';
const parse5 = require('parse5');

const Kind = ts.SyntaxKind;

export function transform(
  filePath: string,
  sourceContent: string,
  exporter: Exporter
) {
  const {links, scripts} = getDependencies(filePath, sourceContent);
  const tsDeps = new Set(scripts);
  const tsScript = renameExt(filePath, '.ts');

  [tsScript, ...scripts]
    .filter((tsScriptPath) => {
      const hasFile = fs.hasFile(tsScriptPath);
      if (!hasFile) {
        console.error(
          `Expected to read "${tsScriptPath}" but the file is not found.`
        );
      }
      return hasFile;
    })
    .forEach((tsScriptPath) => {
      const sourceContent = fs.readFile(tsScriptPath);
      let sourceFile = ts.createSourceFile(
        filePath,
        sourceContent,
        ts.ScriptTarget.ES2015,
        /*setParentNodes */ true
      );
      const moduleDeps = new Set(tsDeps);
      moduleDeps.delete(tsScriptPath);

      sourceFile = addImports(sourceFile, [
        ...links,
        ...Array.from(moduleDeps).map((filePath) => {
          const fileObject = path.parse(filePath);
          fileObject.base = null;
          fileObject.ext = null;
          return path.relative(
            path.dirname(tsScriptPath),
            path.format(fileObject)
          );
        }),
      ]);
      const result = getPreamble(sourceContent) + sourceFile.getText();
      exporter.writeFile(tsScriptPath, result);
    });
}

function remapDependencyToNpm(dep: string) {
  let clause = undefined;

  if (!dep.includes('paper-') && !dep.includes('iron-')) {
    clause = ts.createImportClause(
      undefined,
      ts.createNamedImports([
        ts.createImportSpecifier(
          undefined,
          ts.createIdentifier('DO_NOT_SUBMIT')
        ),
      ])
    );
  } else {
    const polymericImport = dep
      .split('/')
      .find((frag) => frag.startsWith('paper') || frag.startsWith('iron'));
    dep = `@polymer/${polymericImport}`;
  }

  return ts.createImportDeclaration(
    undefined,
    undefined,
    clause,
    ts.createStringLiteral(dep)
  );
}

function addImports(sourceFile: ts.SourceFile, deps: string[]) {
  const importStatements = deps
    .filter((dep) => {
      return (
        !dep.endsWith('polymer/polymer.html') &&
        !dep.endsWith('tf-import/polymer.html')
      );
    })
    .map(remapDependencyToNpm);

  const nonImportIndex = sourceFile.statements.findIndex(
    (statement) => statement.kind !== Kind.ImportDeclaration
  );
  const statements = [
    ...sourceFile.statements.slice(0, nonImportIndex),
    ...importStatements,
    ...sourceFile.statements.slice(nonImportIndex),
  ];

  const update = ts.setTextRange(
    ts.createNodeArray(statements),
    sourceFile.statements
  );
  return updateSource(sourceFile, update);
}

function getDependencies(filePath: string, sourceContent: string) {
  const node = parse5.parse(sourceContent);
  const html = node.childNodes.find((node: Node) => node.tagName === 'html');
  const head = html.childNodes.find((node: Node) => node.tagName === 'head');
  const links = (head ? head.childNodes : [])
    .filter((node: Node) => {
      return (
        node.tagName === 'link' &&
        node.attrs.find((attr) => {
          return attr.name === 'rel' && attr.value === 'import';
        })
      );
    })
    .map((node: Node) => {
      return node.attrs.find((attr) => attr.name === 'href').value;
    });
  const scriptNodes = findScripts(html);
  const externalScripts = scriptNodes.filter((node: Node) => {
    return (
      node.tagName === 'script' &&
      !node.childNodes.length &&
      node.attrs.length &&
      node.attrs.find(({name}) => name === 'src')
    );
  });

  const tsPaths = externalScripts.map((script) => {
    const srcVal = script.attrs.find(({name}) => name === 'src').value;
    if (path.extname(srcVal) !== '.js') {
      console.warn(`[WARN] "src" of script does not end with .js. ${srcVal}`);
      return;
    }
    const jsPath = path.resolve(path.dirname(filePath), srcVal);
    const fileNameObject = path.parse(jsPath);
    fileNameObject.base = null;
    fileNameObject.ext = '.ts';
    return path.format(fileNameObject);
  });
  if (tsPaths.length < scriptNodes.length) {
    const fileNameObject = path.parse(filePath);
    fileNameObject.base = null;
    fileNameObject.ext = '.ts';
    tsPaths.push(path.format(fileNameObject));
  }

  return {links, scripts: tsPaths};
}
