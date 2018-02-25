"use babel";

import * as childProcess from 'child_process';
import { exec, findCachedAsync } from 'atom-linter';

/**
 * Returns the path of the flow executable that is used in the project located at the provided dir.
 */
export function getFlowExecutable(rootDir) {
  return findCachedAsync(rootDir, 'node_modules/.bin/flow');
}
/**
 * Provided a file uses the flow binary from the project of the file and checks the content using
 * flow's check-contents command. The command will take the content and pretent that the content
 * is inside of the provided filename.
 */

export function flowCheckContents(rootDir, file, content) {
  return getFlowExecutable(rootDir).then(exe => exec(exe, ['check-contents', '--json', file], {
    stdin: content,
    cwd: rootDir,
    timeout: 30 * 1000,
    uniqueKey: 'autoimport-check-contents',
    ignoreExitCode: true
  }).then(stdout => JSON.parse(stdout)));
}
export const UNRESOLVED_REGEX = /^Cannot resolve name `([^`]+)`\.$/;
/**
 * Checks if the provided error was cause by an unresolved identifier.
 * If so the identifier is returned.
 */

export function isUnresolvedError(error) {
  if (error.kind === 'infer' || error.level === 'error') {
    const match = error.message[0].descr.match(UNRESOLVED_REGEX);

    if (match) {
      return match[1];
    }
  }

  return null;
}
/**
 * Helper function that maps an array and collects non null/undefined values in a new array.
 */

function collect(mapFn, arr) {
  const col = [];
  arr.map(mapFn).forEach(res => {
    if (res !== null && typeof res !== 'undefined') {
      col.push(res);
    }
  });
  return col;
}
/**
 * Picks the names of all unresolved identifiers from the flow report.
 */


export function findUnresolvedIdentifiers(report) {
  return collect(isUnresolvedError, report.errors);
}