import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        amensg: {
          navy:    '#0B1F3A',
          blue:    '#1769E0',
          cyan:    '#19C3FF',
          teal:    '#20E0B2',
          surface: '#F5F7FA',
          border:  '#e6eefc',
          muted:   '#5a6a82',
          subtle:  '#8ba3c7',
          hover:   '#EEF4FF',
        },
      },
    },
  },
  plugins: [],
}

export default config
