/* @flow */
import * as childProcess from 'child_process';
import { type RootDir } from './dir';
import { type FlowReport, type ErrorReport } from 'flow-bin';

export opaque type FlowBin: string = string;

/**
 * Returns the path of the flow executable that is used in the project located at the provided dir.
 */
export function getFlowExecutable(rootDir: RootDir): Promise<FlowBin> {
  // $FlowFixMe
  const exe = require.resolve('flow-bin', { paths: [rootDir] });
  return exe
    ? Promise.resolve(require(exe))
    : Promise.reject(new Error('Could not resolve flow-bin in root dir'));
}

/**
 * Provided a file uses the flow binary from the project of the file and checks the content using
 * flow's check-contents command. The command will take the content and pretent that the content
 * is inside of the provided filename.
 */
export function flowCheckContents(
  rootDir: RootDir,
  file: string,
  content: string,
): Promise<FlowReport> {
  return getFlowExecutable(rootDir).then(
    exe =>
      new Promise((resolve, reject) => {
        const flowProcess = childProcess.execFile(
          exe,
          ['check-contents', '--json', file],
          { cwd: rootDir, encoding: 'utf-8' },
          (error, stdout) => {
            if (error) {
              console.log(error);
            }
            if (error && !error.message.startsWith('Command failed')) {
              return reject(error);
            }
            try {
              return resolve(JSON.parse(stdout.toString()));
            } catch (e) {
              return reject(e);
            }
          },
        );
        flowProcess.stdin.end(content);
      }),
  );
}

/**
 * Checks if the provided error was cause by an unresolved identifier.
 */
export function isUnresolvedError(error: ErrorReport): boolean {
  if (error.kind !== 'infer' || error.level !== 'error') {
    return false;
  }
  return error.message.some(message => message.descr === 'Could not resolve name');
}

/**
 * Picks the names of all unresolved identifiers from the flow report.
 */
export function findUnresolvedIdentifiers(report: FlowReport): string[] {
  return report.errors.filter(isUnresolvedError).map(error => error.message[0].descr);
}
