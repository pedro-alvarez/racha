/** @type {import('tailwindcss').Config} */
export default {
  // hover só em aparelho com mouse: no celular o "hover" ficava grudado depois do toque
  future: { hoverOnlyWhenSupported: true },
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0B0710',
          soft: '#0F0A14',
        },
        card: {
          from: '#3A0E2A',
          to: '#160A1C',
        },
        accent: {
          DEFAULT: '#F0146B',
          bright: '#FF2D7A',
        },
        muted: {
          DEFAULT: '#9A93A8',
          light: '#B9B2C4',
        },
        positive: '#22C55E',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '3xl': '24px',
      },
      // a escala do toque (propriedade scale) também anima nas classes transition
      transitionProperty: {
        DEFAULT:
          'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter, scale',
        transform: 'transform, scale',
      },
      boxShadow: {
        fab: '0 8px 24px rgba(240, 20, 107, 0.45)',
        card: '0 10px 40px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
};
