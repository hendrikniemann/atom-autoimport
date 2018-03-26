/* @flow */
import * as childProcess from 'child_process';
import { exec, findCachedAsync } from 'atom-linter';
import { type RootDir } from './dir';
import { type FlowReport, type ErrorReport } from 'flow-bin';

export opaque type FlowBin: string = string;

/**
 * Returns the path of the flow executable that is used in the project located at the provided dir.
 * @arg rootDir the project's root dir that contains the flow binary in the node_modules folder
 */
export function getFlowExecutable(rootDir: RootDir): Promise<FlowBin> {
  return findCachedAsync(rootDir, 'node_modules/.bin/flow');
}

/**
 * Provided a file uses the flow binary from the project of the file and checks the content using
 * flow's check-contents command. The command will take the content and pretent that the content
 * is inside of the provided filename.
 * @arg rootDir the projects root directory
 * @arg file the file path that will be used by flow to pretend the content is inside of it
 * @arg content the content that should be flow checked
 */
export function flowCheckContents(
  rootDir: RootDir,
  file: string,
  content: string,
): Promise<FlowReport> {
  return getFlowExecutable(rootDir).then(exe =>
    exec(exe, ['check-contents', '--json', file], {
      stdin: content,
      cwd: rootDir,
      timeout: 30 * 1000,
      uniqueKey: 'autoimport-check-contents',
      ignoreExitCode: true,
    }).then(stdout => JSON.parse(stdout)),
  );
}

export const UNRESOLVED_REGEX = /^Cannot resolve name `([^`]+)`\.$/;

/**
 * Checks if the provided error was cause by an unresolved identifier.
 * If so the identifier is returned.
 * @arg error the flow error from a flow report that should be checked for being an "unresolved
 *   identifier" error
 * @returns the identifier's name or null if the error is not from an undefined identifier
 */
export function isUnresolvedError(error: ErrorReport): ?string {
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
function collect<S, T>(mapFn: S => ?T, arr: $ReadOnlyArray<S>): T[] {
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
 * @arg report a flow report generated from a flow check json output
 */
export function findUnresolvedIdentifiers(report: FlowReport): string[] {
  return collect(isUnresolvedError, report.errors);
}
