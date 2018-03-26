/* @flow */
import * as types from '@babel/types';
import * as babylon from 'babylon';
import generate from '@babel/generator';

type BabelAST = Object;

export type ImportType = {
  type: 'default' | 'named' | 'wildcard' | 'type',
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
    case 'type':
      const i = types.importSpecifier(id, id);
      i.importKind = 'type';
      return i;
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
  const regex = new RegExp(`^import\s.*\sfrom\s+'${imp.source}';$`);
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

/**
 * Parse a single import statement code snippet into a babel ast using babylon
 * @arg code a string containing a single import statement
 */
export function parseImport(code: string) {
  const ast = babylon.parse(code, { sourceType: 'module' });
  return ast.program.body[0];
}

type ReadImportsType = {
  imports: string[],
  before: string, // The file content before the first import statement
  after: string, // The file content after the last import statement
};

/**
 * Consumes all import statements of a file and splits it into code before the statements, code
 * after the statements and lines that are in between these imports.
 * Warning: CURRENTLY DOES NOT SUPPORT CODE OR COMMENTS IN BETWEEN IMPORTS
 */
export function readImports(fileContent: string): ReadImportsType {
  const lines = fileContent.split('\n');
  const before = [];
  const imports = [];
  const after = [];
  const lastIndex = 0;

  // Push line either into before or after depending on if there are imports already
  const addOtherLine = line => (imports.length === 0 ? before.push(line) : after.push(line));
  const isImportStart = line => line.match(/^\s*import/);
  const isImportEnd = line => line.match(/from\s+["'].+["']\s*;?\s*$/);

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (isImportStart(line)) {
      let statement = line;
      while (!isImportEnd(line)) {
        line = lines[++i];
      }
      imports.push(statement);
    } else {
      addOtherLine(line);
    }
  }

  return {
    before: before.join('\n'),
    after: after.join('\n'),
    imports,
  };
}

type WriteImportsType = {

}

export function writeImports()
