module.exports = {
  plugins: [require('tailwindcss'), require('autoprefixer'), require('./christmas-palette.cjs')()],
};
