/* @flow */
import * as fs from 'fs';
import * as path from 'path';
import glob from 'glob';

export opaque type RootDir: string = string;

export type PackageJson = $Shape<{
  version: string,
  dependencies: { [string]: string },
  devDependencies: { [string]: string },
}>;

/**
 * Checks if the given dependency object contains the flow dependency
 * @arg dep An object that lists dependencies that can be found in a package json file
 */
export const hasFlowBin = (dep: ?{ [string]: string }) => dep && dep.hasOwnProperty('flow-bin');

/**
 * Checks if the provided directory contains a package.json, a .flowconfig and flow-bin in either
 * the devDependencies or dependencies of the package.json
 * @arg dir a directory that should be checked for being a root dir
 */
function validateRootDir(dir: string): RootDir {
  if (!fs.existsSync(path.join(dir, '.flowconfig'))) {
    throw new Error('Root dir needs .flowconfig file!');
  }
  const pckgjson = path.join(dir, 'package.json');
  if (!fs.existsSync(pckgjson)) {
    throw new Error('Root dir needs package.json');
  }
  // $FlowFixMe
  const pckg: PackageJson = require(pckgjson);
  if (!hasFlowBin(pckg.dependencies) && !hasFlowBin(pckg.devDependencies)) {
    throw new Error("A flow-bin must be in the package's dependencies!");
  }
  return dir;
}

/**
 * Takes an absolute file or folder path and tries to find the next parent directory that contains a
 * package.json file. Rejects if the path is not absolute or the OS root dir was reached.
 * @arg file The file or folder that needs a project root directory
 */
export function findRootDir(file: string): RootDir {
  if (!path.isAbsolute(file)) {
    throw new TypeError('Argument file of findRootDir must be absulute path!');
  }
  const base = path.dirname(file);
  if (fs.readdirSync(base).includes('package.json')) {
    return validateRootDir(base);
  }
  if (base === '/') {
    throw new Error('Could not find parent directory of file with package.json');
  }
  return findRootDir(base);
}

/**
 * Finds files with the pattern provided. It uses the glob library under the hood to search for the
 * files in the root directory
 * @arg rootDir the project root directory to search in
 * @arg pattern the pattern that will be passed into the glob library
 */
export function findFiles(rootDir: RootDir, pattern: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob(pattern, { cwd: rootDir }, (error, matches) => {
      if (error) {
        return reject(error);
      }
      return resolve(matches);
    });
  });
}
