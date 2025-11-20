/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./frontend/**/*.{js,jsx,ts,tsx}",
    "./templates/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#f5f5f5',
        'primary-hover': '#dcdcdc',
        'primary-dark': '#c4c4c4',
        'bg-dark': '#0A0A0F',
        'bg-card': '#16161D',
        'bg-elevated': '#1E1E28',
        'bg-input': '#2D2D3D',
        'border': '#2D2D3D',
        'text-primary': '#FFFFFF',
        'text-secondary': '#FFFFFF',
        'text-muted': '#FFFFFF',
      }
    }
  },
  plugins: []
}
