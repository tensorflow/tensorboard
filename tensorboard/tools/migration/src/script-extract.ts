import * as ts from 'typescript';
import * as path from 'path';
import {Exporter, getPreamble} from './helper';
import {Node, findScripts} from './html-helper';
const parse5 = require('parse5');

export function transform(
  fileName: string,
  sourceContent: string,
  exporter: Exporter
) {
  const node = parse5.parse(sourceContent);
  const html = node.childNodes.find((node: Node) => node.tagName === 'html');
  const mainModuleName = path.basename(fileName, '.html');

  const scriptNodes = findScripts(html);

  const hasMainModuleScript = scriptNodes.some((node: Node) => {
    return (
      node.attrs.length &&
      node.attrs.some((attr: any) => {
        return attr.name === 'src' && attr.value === mainModuleName + '.js';
      })
    );
  });

  const bodyfulScripts = scriptNodes.filter((node: Node) => {
    return (
      node.tagName === 'script' && !node.attrs.length && node.childNodes.length
    );
  });

  if (hasMainModuleScript && bodyfulScripts.length) {
    console.warn(
      'Invariance violated: JavaScript/TypeScript with the same filename detected. Do not know where to put the content of script tag:',
      fileName
    );
    return;
  }

  if (!bodyfulScripts.length) {
    return;
  }

  const content = bodyfulScripts
    .map((node: Node) => {
      return node.childNodes
        .filter((node) => node.nodeName === '#text')
        .map((node: any) => node.value)
        .join('\n');
    })
    .join('\n');
  const newFileName = mainModuleName + '.ts';
  const sourceFile = ts.createSourceFile(
    newFileName,
    content,
    ts.ScriptTarget.ES2015,
    /*setParentNodes */ true
  );
  const newFilePath = path.join(path.dirname(fileName), newFileName);
  exporter.writeFile(
    newFilePath,
    [getPreamble(content), '\n', sourceFile.getText()].join('\n')
  );
}
