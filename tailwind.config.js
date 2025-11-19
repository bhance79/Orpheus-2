/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./frontend/**/*.{js,jsx,ts,tsx}",
    "./templates/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7B68EE',
        'primary-hover': '#9D8DF1',
        'primary-dark': '#5E4FD1',
        'bg-dark': '#0A0A0F',
        'bg-card': '#16161D',
        'bg-elevated': '#1E1E28',
        'bg-input': '#2D2D3D',
        'border': '#2D2D3D',
        'text-primary': '#E8E8F0',
        'text-secondary': '#A8A8BA',
        'text-muted': '#70708C',
      }
    }
  },
  plugins: []
}
