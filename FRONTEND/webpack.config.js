const path = require('path');

module.exports = {
  module: {
    rules: [
      {
        test: /\.wasm$/,
        type: 'javascript/auto',
        loader: 'file-loader',
        options: {
          name: '[name].[contenthash].[ext]',
        },
      },
    ],
  },
  resolve: {
    fallback: {
      fs: false,
      path: false,
      crypto: false,
    },
  },
}; 