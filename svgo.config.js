module.exports = {
  multipass: true,
  plugins: [
    { name: 'removeViewBox', active: false },
    { name: 'removeUnknownsAndDefaults', active: false },
    { name: 'cleanupAttrs', active: true },
    { name: 'convertStyleToAttrs', active: true }
  ]
};