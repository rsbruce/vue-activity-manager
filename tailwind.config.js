/** @type {import('tailwindcss').Config} */
export default {
  content: ['./resources/**/*.{php, js, ts, vue}'],
  theme: {
    extend: {
      colors: {
        intense: 'var(--project-intense-color)',
        dark: 'var(--project-dark-color)',
        main: 'var(--project-main-color)',
        light: 'var(--project-light-color)',
        general: 'var(--project-general-color)',
        trash: 'var(--project-trash-color)'
      }
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

