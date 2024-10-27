const path = require("path");

module.exports = {
  entry: "./src/main.ts",
  output: {
    path: path.resolve(__dirname, "."),
    filename: "main.js",
    libraryTarget: "commonjs",
  },
  target: "node",
  mode: "development",
  devtool: "source-map",
  externals: {
    obsidian: "commonjs obsidian",
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
};
