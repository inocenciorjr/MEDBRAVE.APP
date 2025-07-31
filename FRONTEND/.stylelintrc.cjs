module.exports = {

  extends: [
    'stylelint-config-standard',
    'stylelint-config-tailwindcss'
  ],
  rules: {
    // Ignora regras desconhecidas relacionadas ao Tailwind e plugins
    'at-rule-no-unknown': [true, {
      ignoreAtRules: [
        'tailwind', 'apply', 'variants', 'responsive', 'screen', 'layer', 'function', 'if', 'each', 'include', 'mixin', 'custom-variant', 'theme'
      ]
    }]
  }
};
