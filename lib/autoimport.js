"use babel";

// $FlowFixMe
import { CompositeDisposable } from 'atom';
import * as fs from 'fs';
import * as path from 'path';
import findpackage from 'find-package';
import { findRootDir } from './dir';
import { addImports } from './import';
import { flowCheckContents, findUnresolvedIdentifiers } from './flow';
import { nodeNativeModulePlugin, installedDependencyDefaultImportPlugin, flowNamedImportPlugin } from './plugins';
import * as glob from 'glob';
export default {
  subscriptions: null,

  activate(state) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable(); // Register command that toggles this view

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'autoimport:import': () => this.import()
    }));
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
      const file = pane.buffer.file.path;
      const range = editor.getBuffer().getRange();
      const text = editor.getTextInBufferRange(range);
      const rootDir = findRootDir(file);
      const report = await flowCheckContents(rootDir, file, text);
      const identifiers = findUnresolvedIdentifiers(report); // $FlowFixMe

      const pckg = require(path.join(rootDir, 'package.json'));

      if (!pckg.dependencies) {
        throw new Error('Expected installed dependencies');
      }

      const toImport = [];

      for (let identifier of identifiers) {
        // TODO: Use readfile and JSON.parse to prevent module caching...
        const installedPackages = Object.keys(pckg.dependencies);
        const imp = await [nodeNativeModulePlugin, installedDependencyDefaultImportPlugin, flowNamedImportPlugin].reduce((previous, next) => {
          return previous.then(value => {
            if (value) {
              return value;
            }

            return next(rootDir, file, identifier, [], installedPackages);
          });
        }, Promise.resolve(null));

        if (imp) {
          toImport.push(imp);
        }
      }

      editor.getBuffer().setTextViaDiff(addImports(text, toImport));
    }
  }

};