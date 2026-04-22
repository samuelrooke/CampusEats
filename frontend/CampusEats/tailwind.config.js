/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Food-focused color palette
        primary: {
          orange: '#f97316',
          'orange-dark': '#d97706',
        },
        secondary: {
          green: '#16a34a',
          'green-dark': '#15803d',
        },
        accent: {
          red: '#dc2626',
          'red-dark': '#b91c1c',
        },
        neutral: {
          dark: '#1f2937',
          light: '#f3f4f6',
        },
      },
      backgroundColor: {
        primary: '#f97316',
        secondary: '#16a34a',
        accent: '#dc2626',
      },
      borderColor: {
        primary: '#f97316',
        secondary: '#16a34a',
      },
      textColor: {
        primary: '#f97316',
        secondary: '#16a34a',
      },
      boxShadow: {
        'primary': '0 4px 12px rgba(249, 115, 22, 0.15)',
        'secondary': '0 4px 12px rgba(22, 163, 74, 0.15)',
      },
      gradients: {
        'orange-gradient': 'linear-gradient(135deg, #d97706 0%, #f97316 100%)',
        'dark-gradient': 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
      },
    },
  },
  plugins: [],
}

