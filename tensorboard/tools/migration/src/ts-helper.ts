import * as ts from 'typescript';

export function updateSource(sourceFile: ts.SourceFile, update: ts.NodeArray<ts.Statement>): ts.SourceFile {
  sourceFile = ts.updateSourceFileNode(sourceFile, update);

  const printer = ts.createPrinter({newLine: ts.NewLineKind.LineFeed});
  const tempFile = ts.createSourceFile(
    sourceFile.fileName,
    '',
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ false,
    ts.ScriptKind.TS,
  );
  const result = printer.printNode(
    ts.EmitHint.Unspecified,
    sourceFile,
    tempFile,
  )
  return ts.createSourceFile(
    sourceFile.fileName,
    result,
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ false,
    ts.ScriptKind.TS,
  );
}


