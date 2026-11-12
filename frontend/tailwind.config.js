const withOpacity = (token) => ({ opacityValue } = {}) => {
  if (opacityValue === undefined) return `var(${token})`;
  return `color-mix(in srgb, var(${token}) ${Number(opacityValue) * 100}%, transparent)`;
};

module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: withOpacity('--purre-violet'),
          orange: withOpacity('--purre-amber'),
          yellow: withOpacity('--purre-amber'),
          peach: withOpacity('--purre-card'),
          red: withOpacity('--purre-red'),
          violet: withOpacity('--purre-violet'),
          green: withOpacity('--purre-green'),
          blue: withOpacity('--purre-blue'),
          surface: withOpacity('--purre-surface'),
          card: withOpacity('--purre-card'),
          border: withOpacity('--purre-border'),
          muted: withOpacity('--purre-text-muted')
        }
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'monospace']
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out both',
        'fade-in': 'fadeIn 0.8s ease-out both',
        'bounce-slow': 'bounce 3s infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        blob: 'blob 7s infinite',
        aurora: 'aurora 14s ease-in-out infinite alternate',
        'rise-in': 'riseIn 500ms cubic-bezier(.2,.8,.2,1) both'
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' }
        },
        aurora: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' }
        },
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(14px) scale(.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
        }
      }
    }
  },
  plugins: []
};
