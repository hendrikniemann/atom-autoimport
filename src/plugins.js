/* @flow */
import camelcase from 'camelcase';
import * as path from 'path';
import { type RootDir } from './dir';
import { type ImportType } from './import';
import { flowCheckContents } from './flow';

export type ImportPlugin = (
  rootDir: RootDir,
  file: string,
  identifier: string,
  localFiles: string[],
  installedPackages: string[],
) => Promise<?ImportType>;

const matchName = (id, pckg) => id.toLowerCase() === camelcase(pckg).toLowerCase();

/**
 * Creates a relative import string given a base file and a file to import
 * @arg base the file path of the file that will do the import
 * @arg toImport the file path of the file that will be imported
 * @returns a relative path that can be required or imported by Node.js
 */
function toImportString(base: string, toImport: string): string {
  let result = path.relative(path.dirname(base), toImport);
  if (!result.startsWith('../')) {
    result = './' + result;
  }
  if (result.endsWith('.js')) {
    result = result.substr(0, result.length - 3);
  }
  return result;
}

/**
 * This plugin has a list of native Node.js modules and returns a wildcard import of a native
 * module when the name matches the identifier
 */
export const nodeNativeModulePlugin: ImportPlugin = (
  rootDir: RootDir,
  file: string,
  identifier: string,
  localFiles: string[],
  installedPackages: string[],
): Promise<?ImportType> => {
  // prettier-ignore
  const nativeModules = [
    'async_hooks', 'assert', 'buffer', 'child_process', 'console', 'constants', 'crypto', 'cluster',
    'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'http2', 'https', 'inspector', 'module',
    'net', 'os', 'path', 'perf_hooks', 'process', 'punycode', 'querystring', 'readline', 'repl',
    'stream', 'string_decoder', 'sys', 'timers', 'tls', 'tty', 'url', 'util', 'v8', 'vm', 'zlib'
  ];
  const source = nativeModules.find(pckg => matchName(identifier, pckg));

  if (source) {
    return Promise.resolve({ type: 'wildcard', identifier, source });
  }
  return Promise.resolve(null);
};

/**
 * Checks if any of provided libraries or local files has a named export with the identifier's
 * name using flow check-contents.
 */
export const flowNamedImportPlugin: ImportPlugin = (
  rootDir: RootDir,
  file: string,
  identifier: string,
  localFiles: string[],
  installedPackages: string[],
): Promise<?ImportType> => {
  const importables = [...localFiles.map(f => toImportString(file, f)), ...installedPackages];
  const imports = importables.map(source => ({ type: 'named', identifier, source }));
  const importLines = importables.map(
    (pckg, index) => `import { ${identifier} as x${index}, asdfasdf as z${index} } from '${pckg}';`,
  );
  return flowCheckContents(rootDir, file, importLines.join('\n')).then(({ errors }) => {
    const toLine = error => error.message[0].line;
    const provokedErrors = errors
      .filter(error =>
        error.message[0].descr.startsWith(
          'Cannot import `asdfasdf` because there is no `asdfasdf` export in',
        ),
      )
      .map(toLine);
    const failedLines = errors
      .filter(
        error =>
          !error.message[0].descr.startsWith(
            'Cannot import `asdfasdf` because there is no `asdfasdf` export in',
          ),
      )
      .map(toLine);
    const okLines = imports.filter((_, index) => {
      if (provokedErrors.includes(index + 1)) {
        return !failedLines.includes(index + 1);
      }
      return false;
    });
    return okLines.length > 0 ? okLines[0] : null;
  });
};

/**
 * This plugin tries to match the identifier with the name of an installed package and returns a
 * default import if it succeeds.
 */
export const installedDependencyDefaultImportPlugin: ImportPlugin = (
  rootDir: RootDir,
  file: string,
  identifier: string,
  localFiles: string[],
  installedPackages: string[],
): Promise<?ImportType> => {
  const source = installedPackages.find(pckg => matchName(identifier, pckg));

  if (source) {
    return Promise.resolve({ type: 'default', identifier, source });
  }
  return Promise.resolve(null);
};

export const projectFileDefaultImportPlugin: ImportPlugin = (
  rootDir: RootDir,
  file: string,
  identifier: string,
  localFiles: string[],
  installedPackages: string[],
): Promise<?ImportType> => {
  const match = localFiles.filter(f => f.endsWith('.js')).find(f => {
    const basename = path.basename(f, '.js');
    return matchName(identifier, basename);
  });

  if (match) {
    const source = toImportString(file, match);
    return Promise.resolve({ type: 'default', identifier, source });
  }
  return Promise.resolve(null);
};
