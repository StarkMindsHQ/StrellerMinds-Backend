/**
 * Flags duplicate Identifier entries in @Module({ imports: [...] }) arrays.
 * Prevents accidental double-registration of NestJS feature modules.
 */
module.exports = {
  rules: {
    'no-duplicate-nest-module-imports': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Disallow duplicate module references in NestJS @Module imports arrays.',
        },
        messages: {
          duplicate:
            'Duplicate "{{name}}" in @Module imports — each Nest module should appear once.',
        },
        schema: [],
      },
      create(context) {
        return {
          Decorator(node) {
            const expr = node.expression;
            if (expr.type !== 'CallExpression') return;
            const { callee } = expr;
            if (callee.type !== 'Identifier' || callee.name !== 'Module') return;
            const [arg] = expr.arguments;
            if (!arg || arg.type !== 'ObjectExpression') return;
            const importsProp = arg.properties.find(
              (p) =>
                p.type === 'Property' &&
                !p.computed &&
                p.key.type === 'Identifier' &&
                p.key.name === 'imports',
            );
            if (!importsProp || importsProp.value.type !== 'ArrayExpression') return;

            const seen = new Set();
            for (const el of importsProp.value.elements) {
              if (!el || el.type !== 'Identifier') continue;
              if (seen.has(el.name)) {
                context.report({
                  node: el,
                  messageId: 'duplicate',
                  data: { name: el.name },
                });
              }
              seen.add(el.name);
            }
          },
        };
      },
    },
  },
};
