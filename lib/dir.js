"use babel";

import * as fs from 'fs';
import * as path from 'path';

/**
 * Checks if the given dependency object contains the flow dependency
 * @arg dep An object that lists dependencies that can be found in a package json file
 */
export const hasFlowBin = dep => dep && dep.hasOwnProperty('flow-bin');
/**
 * Checks if the provided directory contains a package.json, a .flowconfig and flow-bin in either
 * the devDependencies or dependencies of the package.json
 * @arg dir a directory that should be checked for being a root dir
 */

function validateRootDir(dir) {
  if (!fs.existsSync(path.join(dir, '.flowconfig'))) {
    throw new Error('Root dir needs .flowconfig file!');
  }

  const pckgjson = path.join(dir, 'package.json');

  if (!fs.existsSync(pckgjson)) {
    throw new Error('Root dir needs package.json');
  } // $FlowFixMe


  const pckg = require(pckgjson);

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


export function findRootDir(file) {
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