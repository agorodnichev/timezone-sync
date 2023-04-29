const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const WorkboxPlugin = require("workbox-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');

const nodeModulesPath = path.resolve(__dirname, "node_modules");

function buildWorkboxPlugin(mode) {
  const workboxPlugin = new WorkboxPlugin.InjectManifest({
    ...(mode === "development" ? { exclude: [/./] } : undefined),
    swSrc: "./src/features/sw/sw.ts",
    swDest: "sw.js",
  });

  if (mode === "development") {
    Object.defineProperty(workboxPlugin, "alreadyCalled", {
      get() {
        return false;
      },
      set() {},
    });
  }
  return workboxPlugin;
}

module.exports = (env, argv) => {
  return {
    mode: "development",
    entry: {
      index: "./src/index.ts",
    },
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
    module: {
      rules: [
        {
          test: /\.html$/i,
          loader: "html-loader",
        },
        {
          test: /\.ts$/,
          use: "ts-loader",
          exclude: [/node_modules/, nodeModulesPath],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
          type: "asset/resource",
        },
        {
          test: /\.json$/i,
          type: "asset/resource",
          generator: {
            filename: '[name][ext]',
            outputPath: 'assets',
          }
        },
        {
          test: /\.(sa|sc|c)ss$/i,
          use: [MiniCssExtractPlugin.loader, "css-loader"],
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: "asset/resource",
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".scss", ".css"],
    },
    plugins: [
      new Dotenv(),
      new CopyWebpackPlugin({
        patterns: [
          {
          from: path.resolve(__dirname, 'src/assets/data/cities.json'),
          to: path.resolve(__dirname, 'dist/cities.json'),
          },
        ]
      }),
      new HtmlWebpackPlugin({
        filename: "index.html",
        template: "./src/index.html",
      }),
      new MiniCssExtractPlugin(),
      buildWorkboxPlugin(argv.mode),
    ],
    output: {
      filename: "[name].js",
      path: path.resolve(__dirname, "dist"),
      assetModuleFilename: "[name][ext]",
      clean: true,
    },
    optimization: {
      moduleIds: "deterministic",
      runtimeChunk: "single",
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
          },
        },
      },
    },
  };
};
