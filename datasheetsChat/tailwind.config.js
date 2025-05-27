/** @type {import('tailwindcss').Config} */

import { fontFamily as _fontFamily } from 'tailwindcss/defaultTheme';

import colors from 'tailwindcss/colors';

// These are deprecated, so we delete them to avoid warnings and so they are not used.
delete colors['lightBlue'];
delete colors['warmGray'];
delete colors['trueGray'];
delete colors['coolGray'];
delete colors['blueGray'];

const intensities = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const safeColors = ['indigo'];
const safeWidths = ['10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%'];

export const darkMode = 'class';
export const content = [
  './app/**/*.{js,ts,jsx,tsx,mdx}',
  './pages/**/*.{js,ts,jsx,tsx,mdx}',
  './components/**/*.{js,ts,jsx,tsx,mdx}',

  // Or if using `src` directory:
  './src/**/*.{js,ts,jsx,tsx,mdx}',
];
export const theme = {
  extend: {
    fontFamily: {
      sans: ['Inter', 'Inter var', ..._fontFamily.sans],
    },
    colors,
    transitionProperty: {
      height: 'height',
    },
  },
  screens: {
    sm: '640px',
    md: '1024px',
    lg: '1440px',
    xl: '1680px',
  },
};
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

export const plugins = [forms, typography];
export const safelist = [
  ...safeColors.flatMap((color) => intensities.map((intensity) => `bg-${color}-${intensity}`)),
  ...safeColors.flatMap((color) => intensities.map((intensity) => `hover:bg-${color}-${intensity}`)),
  ...safeColors.flatMap((color) => intensities.map((intensity) => `text-${color}-${intensity}`)),
  ...safeColors.flatMap((color) => intensities.map((intensity) => `hover:text-${color}-${intensity}`)),
  ...safeWidths.map((width) => `w-[${width}]`),
];
