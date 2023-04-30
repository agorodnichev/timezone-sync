const WorkboxPlugin = require("workbox-webpack-plugin");
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'production',
  plugins: [
    new WorkboxPlugin.InjectManifest({
        swSrc: "./src/features/sw/sw.ts",
        swDest: "sw.js",
      })
  ]
});