import * as ts from 'typescript';
import {Exporter, TS_LICENSE} from './helper';
import {updateSource} from './ts-helper';
import {PropertiesChanged} from '@polymer/polymer/lib/mixins/properties-changed';

const Kind = ts.SyntaxKind;
const Id = ts.createIdentifier;

function removeIIFE(
  source: ts.SourceFile,
  node: ts.Block | ts.SourceFile = source
): ts.SourceFile {
  let newSource = source;
  const statements = node.statements.reduce((statements, node) => {
    if (node.kind !== Kind.ExpressionStatement) {
      statements.push(node);
      return statements;
    }
    const expression = (node as ts.ExpressionStatement).expression;
    if (expression.kind !== Kind.CallExpression) {
      statements.push(node);
      return statements;
    }
    const callExpression = expression as ts.CallExpression;
    if (callExpression.expression.kind !== Kind.ParenthesizedExpression) {
      statements.push(node);
      return statements;
    }
    const parenExpression = callExpression.expression as ts.ParenthesizedExpression;
    if (parenExpression.expression.kind !== Kind.FunctionExpression) {
      statements.push(node);
      return statements;
    }
    const functionExpression = parenExpression.expression as ts.FunctionExpression;
    statements.push(...functionExpression.body.statements);
    return statements;
  }, []);

  const hasChanged = statements.some((statement, index) => {
    return statement !== node.statements[index];
  });

  if (hasChanged) {
    const update = ts.setTextRange(
      ts.createNodeArray(statements),
      node.statements
    );
    newSource = updateSource(newSource, update);
  }
  return newSource;
}

function removeWrapper(source: ts.SourceFile): ts.SourceFile {
  const tsModule = source.statements.find((maybeModule) => {
    return maybeModule.kind === Kind.ModuleDeclaration;
  }) as ts.ModuleDeclaration;
  let newSource = source;

  if (tsModule) {
    const update = ts.setTextRange(
      ts.createNodeArray((tsModule.body as ts.ModuleBlock).statements),
      source.statements
    );
    newSource = updateSource(newSource, update);
  }

  let oldSource = newSource;
  newSource = removeIIFE(oldSource);
  while (oldSource !== newSource) {
    oldSource = newSource;
    newSource = removeIIFE(oldSource);
  }
  return newSource;
}

function transformPolymer(source: ts.SourceFile): ts.SourceFile {
  let statements = source.statements.reduce((statements, node) => {
    if (node.kind !== Kind.ExpressionStatement) {
      statements.push(node);
      return statements;
    }
    const expression = (node as ts.ExpressionStatement).expression;
    if (expression.kind !== Kind.CallExpression) {
      statements.push(node);
      return statements;
    }
    const callExpression = expression as ts.CallExpression;
    if (callExpression.expression.kind !== Kind.Identifier) {
      statements.push(node);
      return statements;
    }
    const idExpression = callExpression.expression as ts.Identifier;
    const firstArg = callExpression.arguments[0] as ts.ObjectLiteralExpression;

    if (
      idExpression.text !== 'Polymer' ||
      !firstArg ||
      firstArg.kind !== Kind.ObjectLiteralExpression
    ) {
      statements.push(node);
      return statements;
    }
    statements.push(...polymerFnToElement(firstArg));
    return statements;
  }, []);

  statements = maybeAddImportStatements(statements);
  const update = ts.setTextRange(
    ts.createNodeArray(statements),
    source.statements
  );
  source = updateSource(source, update);
  return source;
}

function getStaticProp(
  polymerSpecAst: ts.ObjectLiteralExpression,
  propName: string
) {
  const propertiesProp = polymerSpecAst.properties.find((prop) => {
    return (
      prop.kind === Kind.PropertyAssignment &&
      (prop.name as ts.Identifier).text === propName
    );
  }) as ts.PropertyAssignment;
  return propertiesProp;
}

function propName(prop: ts.PropertyAssignment): string {
  if (ts.isIdentifier(prop.name)) {
    return prop.name.text;
  }
  return prop.name.getText();
}

function initializerValue(initializer: ts.Expression): string {
  if (ts.isIdentifier(initializer)) {
    return initializer.text;
  }
  if (ts.isStringLiteral(initializer)) {
    return initializer.text;
  }
  return initializer.getText();
}

function hasMethodDecorator(
  declaration: ts.ClassDeclaration,
  decoratorName: string
) {
  return declaration.members.some((maybeProp) => {
    return (
      ts.isPropertyDeclaration(maybeProp) &&
      maybeProp.decorators &&
      maybeProp.decorators.some((decorator) => {
        return (
          ts.isCallExpression(decorator.expression) &&
          ts.isIdentifier(decorator.expression.expression) &&
          decorator.expression.expression.text === decoratorName
        );
      })
    );
  });
}

function hasImport(statements: ts.Statement[], moduleName: string) {
  return statements.some((statement) => {
    return (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === moduleName
    );
  });
}

function maybeAddImportStatements(statements: ts.Statement[]) {
  const polymerClasses = statements.filter((statement) => {
    if (ts.isClassDeclaration(statement)) {
      return (
        statement.heritageClauses &&
        statement.heritageClauses.some((heritage) => {
          return (
            heritage.token === ts.SyntaxKind.ExtendsKeyword &&
            heritage.types.some((type) => {
              return (
                ts.isExpressionWithTypeArguments(type) &&
                ts.isIdentifier(type.expression) &&
                type.expression.text === 'PolymerElement'
              );
            })
          );
        })
      );
    }
  }) as ts.ClassDeclaration[];
  const hasPropertyDecorator = polymerClasses.some((polymerClass) =>
    hasMethodDecorator(polymerClass, 'property')
  );
  const hasObserveDecorator = polymerClasses.some((polymerClass) =>
    hasMethodDecorator(polymerClass, 'observe')
  );
  const hasListenDecorator = polymerClasses.some((polymerClass) =>
    hasMethodDecorator(polymerClass, 'listen')
  );
  const hasComputedDecorator = polymerClasses.some((polymerClass) =>
    hasMethodDecorator(polymerClass, 'computed')
  );
  const shouldImportPolymer =
    !hasImport(statements, '@polymer/polymer') && polymerClasses.length;
  const shouldLoadPolymerDecorator =
    !hasImport(statements, '@polymer/decorators') &&
    (polymerClasses.length ||
      hasListenDecorator ||
      hasPropertyDecorator ||
      hasObserveDecorator ||
      hasComputedDecorator);

  const importPolymer = shouldImportPolymer
    ? ts.createImportDeclaration(
        undefined,
        undefined,
        ts.createImportClause(
          undefined,
          ts.createNamedImports([
            ts.createImportSpecifier(
              undefined,
              ts.createIdentifier('PolymerElement')
            ),
            ts.createImportSpecifier(undefined, ts.createIdentifier('html')),
          ])
        ),
        ts.createLiteral('@polymer/polymer')
      )
    : undefined;
  const importPolymerDecorators = shouldLoadPolymerDecorator
    ? ts.createImportDeclaration(
        undefined,
        undefined,
        ts.createImportClause(
          undefined,
          ts.createNamedImports(
            [
              polymerClasses.length
                ? ts.createImportSpecifier(
                    undefined,
                    ts.createIdentifier('customElement')
                  )
                : undefined,
              hasPropertyDecorator
                ? ts.createImportSpecifier(
                    undefined,
                    ts.createIdentifier('property')
                  )
                : undefined,
              hasObserveDecorator
                ? ts.createImportSpecifier(
                    undefined,
                    ts.createIdentifier('observe')
                  )
                : undefined,
              hasListenDecorator
                ? ts.createImportSpecifier(
                    undefined,
                    ts.createIdentifier('listen')
                  )
                : undefined,
              hasComputedDecorator
                ? ts.createImportSpecifier(
                    undefined,
                    ts.createIdentifier('computed')
                  )
                : undefined,
            ].filter(Boolean)
          )
        ),
        ts.createLiteral('@polymer/decorators')
      )
    : undefined;

  return [importPolymer, importPolymerDecorators, ...statements].filter(
    Boolean
  );
}

function getPropsAstNodes(props: ts.PropertyAssignment) {
  if (!props) return [];
  return (props.initializer as ts.ObjectLiteralExpression).properties.map(
    (prop: ts.PropertyAssignment) => {
      if (!prop) return null;
      const propProperties = ts.isObjectLiteralExpression(prop.initializer)
        ? prop.initializer.properties
        : ts.createNodeArray<ts.ObjectLiteralElementLike>();
      const valueInitializer = propProperties.find(
        (prop: ts.PropertyAssignment) => propName(prop) === 'value'
      ) as ts.PropertyAssignment;
      const typeProp =
        propProperties &&
        (propProperties.find((prop: ts.PropertyAssignment) => {
          return propName(prop) === 'type';
        }) as ts.PropertyAssignment);
      const typeInitializer = typeProp
        ? typeProp.initializer
        : ts.isIdentifier(prop.initializer)
        ? prop.initializer
        : null;

      let initializer = undefined;
      let type:
        | ts.ArrayTypeNode
        | ts.KeywordTypeNode = ts.createKeywordTypeNode(
        ts.SyntaxKind.UnknownKeyword
      );

      if (typeInitializer) {
        switch (initializerValue(typeInitializer)) {
          case 'Boolean':
            type = ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
            break;
          case 'String':
            type = ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
            break;
          case 'Number':
            type = ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
            break;
          case 'Array':
            type = ts.createArrayTypeNode(
              ts.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
            );
            break;
          default:
            type = ts.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword);
        }
        // Do something useful for other types.
        initializer = valueInitializer
          ? valueInitializer.initializer
          : undefined;
      }
      const computed =
        propProperties &&
        (propProperties.find((prop: ts.PropertyAssignment) => {
          return propName(prop) === 'computed';
        }) as ts.PropertyAssignment);

      let decoratorBody;
      if (computed) {
        decoratorBody = propProperties
          .filter((prop: ts.PropertyAssignment) => {
            return propName(prop) === 'computed';
          })
          .map((prop: ts.PropertyAssignment) => {
            return prop.initializer;
          });
      } else {
        const propertyObj = ts.isObjectLiteralExpression(prop.initializer)
          ? ts.updateObjectLiteral(
              prop.initializer,
              propProperties.filter((prop: ts.PropertyAssignment) => {
                return (
                  propName(prop) !== 'computed' && propName(prop) !== 'value'
                );
              })
            )
          : ts.createObjectLiteral([
              ts.createPropertyAssignment('type', typeInitializer),
            ]);
        decoratorBody = [propertyObj];
      }
      const decoratorExpression = ts.createCall(
        ts.createIdentifier(computed ? 'computed' : 'property'),
        undefined,
        decoratorBody
      );
      const decorator = ts.createDecorator(decoratorExpression);

      return ts.createProperty(
        [decorator],
        undefined,
        propName(prop),
        undefined,
        type,
        initializer
      );
    }
  );
}

function parsePolymerStringDeclaration(listenerOrObserver: string) {
  const match = /(\S+)\((.*)\)/.exec(listenerOrObserver);
  const methodName = match[1];
  const content = match[2];

  return {methodName, args: content.split(/,\s*/)};
}

function flattenProperties(
  decoratorName: string,
  props: ts.PropertyAssignment
) {
  if (props && ts.isArrayLiteralExpression(props.initializer)) {
    return props.initializer.elements.map((el) => {
      if (!ts.isStringLiteral(el)) {
        return null;
      }

      const {methodName, args} = parsePolymerStringDeclaration(el.text);
      const decoratorExpression = ts.createCall(
        ts.createIdentifier(decoratorName),
        undefined,
        args.map((arg) => ts.createStringLiteral(arg))
      );
      const decorator = ts.createDecorator(decoratorExpression);

      return ts.createMethod(
        [decorator],
        undefined,
        undefined,
        methodName,
        undefined,
        undefined,
        undefined,
        undefined,
        ts.createBlock([])
      );
    });
  }
  return [];
}

function polymerFnToElement(
  polymerSpecAst: ts.ObjectLiteralExpression
): ts.Statement[] {
  const nameProp = polymerSpecAst.properties.find((prop) => {
    return (
      prop.kind === Kind.PropertyAssignment &&
      (prop.name as ts.Identifier).text === 'is' &&
      prop.initializer.kind === Kind.StringLiteral
    );
  }) as ts.PropertyAssignment;

  const dashedName = (nameProp.initializer as ts.StringLiteral).text;
  const name = dashedName
    .trim()
    .split('-')
    .map((frag: string) => {
      return frag[0].toUpperCase() + frag.slice(1);
    })
    .join('');

  const props = new Set(
    getPropsAstNodes(getStaticProp(polymerSpecAst, 'properties'))
  );
  const observers = new Set(
    flattenProperties('observe', getStaticProp(polymerSpecAst, 'observers'))
  );
  const listeners = new Set(
    flattenProperties('listen', getStaticProp(polymerSpecAst, 'listeners'))
  );

  const computedPropNames = new Map<
    string,
    {args: string[]; prop: ts.PropertyDeclaration}
  >();
  props.forEach((prop) => {
    if (!ts.isPropertyDeclaration(prop)) return;
    const [decorator] = prop.decorators;
    if (!ts.isCallExpression(decorator.expression)) return;
    if (!ts.isIdentifier(decorator.expression.expression)) return;
    if (decorator.expression.expression.text !== 'computed') return;
    const computedStatement = decorator.expression.arguments[0];
    if (!ts.isStringLiteral(computedStatement)) return;
    const {methodName, args} = parsePolymerStringDeclaration(
      computedStatement.text
    );
    computedPropNames.set(methodName, {args, prop});
  });
  const knownMethodNames = new Map<string, ts.ClassElement>();
  observers.forEach((observer) => {
    if (!ts.isMethodDeclaration(observer)) return;
    if (!ts.isIdentifier(observer.name)) return;
    knownMethodNames.set(observer.name.text, observer);
  });
  listeners.forEach((listener) => {
    if (!ts.isMethodDeclaration(listener)) return;
    if (!ts.isIdentifier(listener.name)) return;
    knownMethodNames.set(listener.name.text, listener);
  });

  const methods = polymerSpecAst.properties
    .filter((prop) => {
      const isPolymerMethod =
        ts.isPropertyAssignment(prop) &&
        ts.isIdentifier(prop.name) &&
        (prop.name.text === 'is' ||
          prop.name.text === 'properties' ||
          prop.name.text === 'observers' ||
          prop.name.text === 'listeners');
      return !isPolymerMethod;
    })
    .map((prop) => {
      if (!ts.isPropertyAssignment(prop)) return prop;
      if (ts.isFunctionExpression(prop.initializer)) {
        return ts.createMethod(
          undefined,
          undefined,
          undefined,
          prop.name,
          undefined,
          undefined,
          prop.initializer.parameters,
          undefined,
          prop.initializer.body
        );
      }
      if (ts.isArrowFunction(prop.initializer)) {
        return ts.createMethod(
          undefined,
          undefined,
          undefined,
          prop.name,
          undefined,
          undefined,
          prop.initializer.parameters,
          undefined,
          ts.isBlock(prop.initializer.body)
            ? prop.initializer.body
            : ts.createBlock([ts.createReturn(prop.initializer.body)])
        );
      }

      return prop;
    })
    .map((method) => {
      if (
        !ts.isMethodDeclaration(method) ||
        !ts.isIdentifier(method.name) ||
        !knownMethodNames.has(method.name.text)
      ) {
        return method;
      }

      const decoratedMethod = knownMethodNames.get(method.name.text);
      if (!ts.isMethodDeclaration(decoratedMethod)) return method;

      observers.delete(decoratedMethod);
      listeners.delete(decoratedMethod);

      return ts.createMethod(
        decoratedMethod.decorators,
        method.modifiers,
        method.asteriskToken,
        method.name,
        method.questionToken,
        [],
        [],
        method.type,
        method.body
      );
    })
    .map((method) => {
      if (
        !ts.isMethodDeclaration(method) ||
        !ts.isIdentifier(method.name) ||
        !computedPropNames.has(method.name.text)
      ) {
        return method;
      }

      const {args, prop} = computedPropNames.get(method.name.text);
      props.delete(prop);

      return ts.createGetAccessor(
        [
          ts.createDecorator(
            ts.createCall(
              ts.createIdentifier('computed'),
              undefined,
              args.map((arg) => ts.createStringLiteral(arg))
            )
          ),
        ],
        method.modifiers,
        prop.name,
        [],
        prop.type,
        method.body
      );
    });

  const members = [...props, ...observers, ...listeners, ...methods].filter(
    Boolean
  ) as ts.ClassElement[];

  const baseClass = ts.createIdentifier('PolymerElement');
  const heritageClause = ts.createHeritageClause(Kind.ExtendsKeyword, [
    ts.createExpressionWithTypeArguments(null, baseClass),
  ]);

  const decoratorExpression = ts.createCall(
    ts.createIdentifier('customElement'),
    undefined,
    [ts.createStringLiteral(initializerValue(nameProp.initializer))]
  );
  const decorator = ts.createDecorator(decoratorExpression);

  const elementClass = ts.createClassDeclaration(
    [decorator],
    null,
    name,
    null,
    [heritageClause],
    members
  );

  return [elementClass];
}

export function transform(
  fileName: string,
  sourceContent: string,
  exporter: Exporter
) {
  const range = ts.getLeadingCommentRanges(sourceContent, 0);
  const preamble = range
    ? range.map(({pos, end}) => sourceContent.slice(pos, end)).join('\n')
    : TS_LICENSE;
  let sourceFile = ts.createSourceFile(
    fileName,
    sourceContent,
    ts.ScriptTarget.ES2015,
    /*setParentNodes */ true
  );
  sourceFile = removeWrapper(sourceFile);
  sourceFile = transformPolymer(sourceFile);
  const result = `${preamble}
${sourceFile.getText()}`;
  exporter.writeFile(fileName, result);
}
