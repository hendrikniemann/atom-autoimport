/* @flow */
import * as types from '@babel/types';
import * as babylon from 'babylon';
import generate from '@babel/generator';

type BabelAST = Object;

export type ImportType = {
  type: 'default' | 'named' | 'wildcard',
  identifier: string,
  source: string,
};

/**
 * Creates the AST for the inner part of an import statement
 */
export function createImport({ type, identifier, source }: ImportType): BabelAST {
  const id = types.identifier(identifier);
  switch (type) {
    case 'default':
      return types.importDefaultSpecifier(id);
    case 'named':
      return types.importSpecifier(id, id);
    case 'wildcard':
      return types.importNamespaceSpecifier(id);
    default:
      throw new TypeError(`Unknown import type ${type}`);
  }
}

/**
 * Creates an AST for an import declaration with a single import
 */
export function createImportDeclaration(imp: ImportType): BabelAST {
  return types.importDeclaration([createImport(imp)], types.stringLiteral(imp.source));
}

export function mergeImports(imp: ImportType, ast: BabelAST) {
  if (imp.type === 'default' && ast.specifiers.some(types.isImportDefaultSpecifier)) {
    throw new Error(
      `Tried to import default from ${imp.source} but default import already exists!`,
    );
  } else if (imp.type === 'wildcard') {
    throw new Error(
      `Cannot merge wildcard import with existing wildcard import of dependency ${imp.source}!`,
    );
  }
  ast.specifiers.push(createImport(imp));
  return ast;
}

/**
 * Takes a program and adds an import to the program.
 * If the imported module name is already imported the import statement is extended.
 * If the imported module name is not imported yet a new import is created.
 */
export function addImport(fileContent: string, imp: ImportType): string {
  let lines = fileContent.split('\n');
  const regex = new RegExp(`^import .* from '${imp.source}';$`);
  const existingImport = lines.findIndex(line => regex.test(line));
  if (existingImport >= 0) {
    const ast = babylon.parse(lines[existingImport], { sourceType: 'module' });
    mergeImports(imp, ast.program.body[0]);
    lines[existingImport] = generate(ast).code;
  } else {
    const newLine = generate(createImportDeclaration(imp)).code;
    let lastImport = 0;
    lines.forEach((line, index) => {
      if (line.startsWith('import ') || /^\s*(\/\/|\/\*|\*)/.test(line)) {
        lastImport = index;
      }
    });
    lines = [...lines.slice(0, lastImport + 1), newLine, ...lines.slice(lastImport + 1)];
  }
  return lines.join('\n');
}

export function addImports(fileContent: string, imps: $ReadOnlyArray<ImportType>): string {
  return imps.reduce((content, imp) => addImport(content, imp), fileContent);
}
