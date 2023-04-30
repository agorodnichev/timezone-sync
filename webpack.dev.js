const path = require("path");
const WorkboxPlugin = require("workbox-webpack-plugin");
const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");

function buildWorkboxPlugin() {
  const workboxPlugin = new WorkboxPlugin.InjectManifest({
    exclude: [/./],
    swSrc: "./src/features/sw/sw.ts",
    swDest: "sw.js",
  });

  Object.defineProperty(workboxPlugin, "alreadyCalled", {
    get() {
      return false;
    },
    set() {},
  });
  return workboxPlugin;
}

module.exports = merge(common, {
  mode: "development",
  devtool: "inline-source-map",
  devServer: {
    devMiddleware: {
      writeToDisk: true,
    },
    static: {
      directory: path.join(__dirname, "dist"),
    },
    headers: {
      "Service-Worker-Allowed": "/",
    },
    hot: true,
  },
  plugins: [
    buildWorkboxPlugin()
  ],
});
