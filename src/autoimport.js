/* @flow */

declare var atom: any;

// $FlowFixMe
import { CompositeDisposable } from 'atom';
import * as fs from 'fs';
import * as path from 'path';
import findpackage from 'find-package';
import { type PackageJson, findRootDir, findFiles } from './dir';
import { type ImportType, addImports } from './import';
import { flowCheckContents, findUnresolvedIdentifiers } from './flow';
import {
  type ImportPlugin,
  nodeNativeModulePlugin,
  installedDependencyDefaultImportPlugin,
  flowNamedImportPlugin,
  projectFileDefaultImportPlugin,
} from './plugins';
import { type FlowReport } from 'flow-bin';
import * as glob from 'glob';

export default {
  subscriptions: null,

  activate(state: {}) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        'autoimport:import': () => this.import(),
      }),
    );
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  serialize() {
    return {};
  },

  async import() {
    const editor = atom.workspace.getActiveTextEditor();

    const pane = atom.workspace.getActivePaneItem();
    if (editor && pane) {
      const range = editor.getBuffer().getRange();
      const text = editor.getTextInBufferRange(range);
      const rootDir = findRootDir(pane.buffer.file.path);
      const file = path.relative(rootDir, pane.buffer.file.path);
      const projectFiles = await findFiles(rootDir, 'src/**/*.js');
      const report = await flowCheckContents(rootDir, file, text);
      const identifiers = findUnresolvedIdentifiers(report);
      // $FlowFixMe
      const pckg: PackageJson = require(path.join(rootDir, 'package.json'));
      if (!pckg.dependencies) {
        throw new Error('Expected installed dependencies');
      }

      const toImport: Array<ImportType> = [];

      for (let identifier of identifiers) {
        // TODO: Use readfile and JSON.parse to prevent module caching...
        const installedPackages = Object.keys(pckg.dependencies);

        const imp: ?ImportType = await [
          nodeNativeModulePlugin,
          installedDependencyDefaultImportPlugin,
          projectFileDefaultImportPlugin,
          flowNamedImportPlugin,
        ].reduce((previous, next: ImportPlugin) => {
          return previous.then((value: ?ImportType) => {
            if (value) {
              return value;
            }
            return next(rootDir, file, identifier, projectFiles, installedPackages);
          });
        }, Promise.resolve(null));

        if (imp) {
          toImport.push(imp);
        }
      }
      editor.getBuffer().setTextViaDiff(addImports(text, toImport));
    }
  },
};
