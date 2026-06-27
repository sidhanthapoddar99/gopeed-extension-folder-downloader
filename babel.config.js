export default {
  presets: [
    [
      '@babel/preset-env',
      {
        // Gopeed's JS engine (goja) supports native async/await, so keep it
        // rather than dragging in regenerator-runtime; transpile the rest of
        // ES6+ down to ES5.1.
        exclude: ['transform-async-to-generator', 'transform-regenerator'],
      },
    ],
    ['@babel/preset-typescript'],
  ],
};
