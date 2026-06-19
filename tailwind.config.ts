import type { Config } from "tailwindcss";

// all in fixtures is set to tailwind v3 as interims solutions

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			// Completion juice
  			'float-xp': {
  				'0%': { opacity: '0', transform: 'translateY(0) scale(0.8)' },
  				'10%': { opacity: '1', transform: 'translateY(-6px) scale(1)' },
  				'85%': { opacity: '1', transform: 'translateY(-22px) scale(1)' },
  				'100%': { opacity: '0', transform: 'translateY(-30px) scale(1)' },
  			},
  			'task-pop': {
  				'0%': { transform: 'scale(1)' },
  				'40%': { transform: 'scale(1.015)' },
  				'100%': { transform: 'scale(1)' },
  			},
  			// Generic character hero (calm fallback)
  			'hero-breathe': {
  				'0%, 100%': { transform: 'translateY(0) scale(1)' },
  				'50%': { transform: 'translateY(-4px) scale(1.012)' },
  			},
  			'hero-celebrate': {
  				'0%': { transform: 'translateY(0) scale(1)' },
  				'30%': { transform: 'translateY(-10px) scale(1.06)' },
  				'55%': { transform: 'translateY(0) scale(0.97)' },
  				'100%': { transform: 'translateY(0) scale(1)' },
  			},
  			// Mika — energetic genki idle + cheer
  			'mika-bob': {
  				'0%, 100%': { transform: 'translateY(0) scaleY(1) scaleX(1)' },
  				'25%': { transform: 'translateY(-6px) scaleY(1.025) scaleX(0.99)' },
  				'50%': { transform: 'translateY(-9px) scaleY(1.035) scaleX(0.982)' },
  				'75%': { transform: 'translateY(-6px) scaleY(1.025) scaleX(0.99)' },
  			},
  			'mika-sway': {
  				'0%, 100%': { transform: 'rotate(-1.6deg)' },
  				'50%': { transform: 'rotate(1.6deg)' },
  			},
  			'mika-cheer': {
  				'0%': { transform: 'translateY(0) scaleX(1) scaleY(1) rotate(0deg)' },
  				'12%': { transform: 'translateY(2px) scaleX(1.06) scaleY(0.9) rotate(0deg)' },
  				'34%': { transform: 'translateY(-22px) scaleX(0.96) scaleY(1.08) rotate(-6deg)' },
  				'50%': { transform: 'translateY(-20px) scaleX(0.98) scaleY(1.05) rotate(6deg)' },
  				'68%': { transform: 'translateY(0) scaleX(1.07) scaleY(0.92) rotate(0deg)' },
  				'82%': { transform: 'translateY(-6px) scaleX(0.99) scaleY(1.02) rotate(0deg)' },
  				'100%': { transform: 'translateY(0) scaleX(1) scaleY(1) rotate(0deg)' },
  			},
  			'mika-glow': {
  				'0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
  				'50%': { opacity: '0.85', transform: 'scale(1.14)' },
  			},
  			'mika-twinkle': {
  				'0%, 100%': { opacity: '0', transform: 'scale(0.5) rotate(0deg)' },
  				'50%': { opacity: '0.9', transform: 'scale(1) rotate(20deg)' },
  			},
  			'mika-sparkle-burst': {
  				'0%': { opacity: '0', transform: 'scale(0.3) translateY(2px)' },
  				'30%': { opacity: '1', transform: 'scale(1.3) translateY(-6px)' },
  				'100%': { opacity: '0', transform: 'scale(0.7) translateY(-18px)' },
  			},
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'float-xp': 'float-xp 3000ms ease-out forwards',
  			'task-pop': 'task-pop 300ms ease-out',
  			'hero-breathe': 'hero-breathe 3500ms ease-in-out infinite',
  			'hero-celebrate': 'hero-celebrate 550ms ease-out',
  			'mika-bob': 'mika-bob 2200ms ease-in-out infinite',
  			'mika-sway': 'mika-sway 4300ms ease-in-out infinite',
  			'mika-cheer': 'mika-cheer 780ms cubic-bezier(0.22, 1, 0.36, 1)',
  			'mika-glow': 'mika-glow 2200ms ease-in-out infinite',
  			'mika-twinkle': 'mika-twinkle 2600ms ease-in-out infinite',
  			'mika-sparkle-burst': 'mika-sparkle-burst 780ms ease-out',
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
