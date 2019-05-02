import * as path from 'path';
import {Exporter, fs} from './helper';
import {Node, findScripts} from './html-helper';
const parse5 = require('parse5');

export function transform(
  fileName: string,
  sourceContent: string,
  exporter: Exporter
) {
  const node = parse5.parse(sourceContent);
  const html = node.childNodes.find((node: Node) => node.tagName === 'html');

  const scriptNodes = findScripts(html);
  const externalScripts = scriptNodes.filter((node: Node) => {
    return (
      node.tagName === 'script' &&
      !node.childNodes.length &&
      node.attrs.length &&
      node.attrs.find(({name}) => name === 'src')
    );
  });

  externalScripts.forEach((script) => {
    const srcVal = script.attrs.find(({name}) => name === 'src').value;
    if (path.extname(srcVal) !== '.js') {
      console.warn(`[WARN] "src" of script does not end with .js. ${srcVal}`);
      return;
    }
    const jsPath = path.resolve(path.dirname(fileName), srcVal);
    const fileNameObject = path.parse(jsPath);
    fileNameObject.base = null;
    fileNameObject.ext = '.ts';
    const tsPath = path.format(fileNameObject);
    if (fs.hasFile(jsPath) && fs.hasFile(tsPath)) {
      console.warn(
        `[WARN] Both TypeScript and JavaScript with the same file name exists. ${jsPath}`
      );
    } else if (fs.hasFile(jsPath)) {
      exporter.rename(jsPath, tsPath);
    }
  });
}
