import * as ts from 'typescript';
import * as path from 'path';
import {Exporter, fs, getPreamble} from './helper';
import {Node} from './html-helper';
import {updateSource} from './ts-helper';
const parse5 = require('parse5');

const Kind = ts.SyntaxKind;

function changeExt(filePath: string, ext: string) {
  const fileObject = path.parse(filePath);
  fileObject.base = null;
  fileObject.ext = ext;
  return path.format(fileObject);
}

function getDomModules(
  sourceContent: string
): Array<{id: string; template: string}> {
  const node = parse5.parse(sourceContent);
  const html = node.childNodes.find((node: Node) => node.tagName === 'html');
  const body = html.childNodes.find((node: Node) => node.tagName === 'body');
  const domModules = (body ? body.childNodes : []).filter((node: Node) => {
    return (
      node.tagName === 'dom-module' &&
      node.attrs.find((attr) => attr.name === 'id')
    );
  });

  return domModules
    .map((node: Node) => {
      const id = node.attrs.find((attr) => attr.name === 'id').value;
      const templateNode = node.childNodes.find(
        (node: Node) => node.tagName === 'template'
      );

      if (!templateNode) {
        console.warn('<dom-module> does not contain any <template>');
        return;
      }

      const template = parse5.serialize((templateNode as any).content).trim();
      return {id, template};
    })
    .filter(Boolean);
}

function findDomModuleStatement(
  node: ts.SourceFile,
  moduleId: string
): ts.ClassDeclaration {
  return node.statements.find((statement) => {
    return (
      ts.isClassDeclaration(statement) &&
      statement.decorators &&
      statement.decorators.find((decorator) => {
        if (!ts.isCallExpression(decorator.expression)) return false;
        if (!ts.isIdentifier(decorator.expression.expression)) return false;
        if (decorator.expression.expression.text !== 'customElement')
          return false;
        return decorator.expression.arguments.some((exp) => {
          return ts.isStringLiteral(exp) && exp.text === moduleId;
        });
      })
    );
  }) as ts.ClassDeclaration;
}

export function transform(
  filePath: string,
  sourceContent: string,
  exporter: Exporter
) {
  const domModules = getDomModules(sourceContent);
  const mainTsPath = changeExt(filePath, '.ts');
  let sourceFile = ts.createSourceFile(
    mainTsPath,
    fs.readFile(mainTsPath),
    ts.ScriptTarget.ES2015,
    /*setParentNodes */ true
  );
  const replacements = new Map<ts.Statement, ts.Statement>();

  domModules.forEach((mod) => {
    const {id, template} = mod;
    const statement = findDomModuleStatement(sourceFile, id);
    if (!statement) {
      console.warn(
        `Could not find a Polymer subclass for dom-module id: ${id}`
      );
      return;
    }
    const newProp = ts.createProperty(
      undefined,
      [
        ts.createModifier(Kind.StaticKeyword),
        ts.createModifier(Kind.ReadonlyKeyword),
      ],
      'template',
      undefined,
      undefined,
      ts.createTaggedTemplate(
        ts.createIdentifier('html'),
        ts.createNoSubstitutionTemplateLiteral(template)
      )
    );
    const newStatement = ts.getMutableClone(statement);
    newStatement.members = ts.createNodeArray([newProp, ...statement.members]);
    replacements.set(statement, newStatement);
  });

  const statements = sourceFile.statements.map(
    (statement) => replacements.get(statement) || statement
  );
  const update = ts.setTextRange(
    ts.createNodeArray(statements),
    sourceFile.statements
  );
  sourceFile = updateSource(sourceFile, update);
  const result = getPreamble(sourceContent) + sourceFile.getText();
  exporter.writeFile(mainTsPath, result);
}
