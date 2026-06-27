import path from 'path';
import { fileURLToPath } from 'url';
import GopeedPolyfillPlugin from 'gopeed-polyfill-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default (_, argv) => ({
  entry: './src/index.ts',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  devtool: argv.mode === 'production' ? undefined : false,
  plugins: [new GopeedPolyfillPlugin()],
  module: {
    rules: [
      {
        test: /\.[jt]s$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
});
