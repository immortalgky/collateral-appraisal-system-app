/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Colors are now centralized in src/styles/theme.css using @theme directive
    },
  },
  // Tailwind CSS v4 plugins are handled differently - they're configured in postcss.config.js
};
