/* @flow */
import camelcase from 'camelcase';
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

const matchName = (id, pckg) => id === camelcase(pckg);

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
  const imports = installedPackages.map(source => ({ type: 'named', identifier, source }));
  const importLines = installedPackages.map(
    (pckg, index) => `import { ${identifier} as x${index}, asdfasdf as z${index} } from '${pckg}';`,
  );
  return flowCheckContents(rootDir, file, importLines.join('\n')).then(({ errors }) => {
    const toLine = error => error.message[0].line;
    const provokedErrors = errors
      .filter(
        error => error.message[1].descr === 'This module has no named export called `asdfasdf`.',
      )
      .map(toLine);
    const failedLines = errors
      .filter(
        error => error.message[1].descr !== 'This module has no named export called `asdfasdf`.',
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
