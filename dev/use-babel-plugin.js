const t = require('@babel/types');

module.exports = function() {
  return {
    visitor: {
      Program(path) {
        const { node } = path;

        for (const directive of node.directives) {
          if (directive.value.value === 'use babel') return;
        }

        path.unshiftContainer('directives', t.directive(t.directiveLiteral('use babel')));
      },
    },
  };
}
