
import flowbite from 'flowbite-react/tailwind';

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    
    flowbite.content(),
  ],
  plugins: [
    // ...
    flowbite.plugin(),
    require('daisyui'),
  ],


  daisyui: {
    darkTheme: "light",
   },
   
  theme: {
    fontSize: {
      sm: '0.8rem',
      base: '1rem',
      xl: '1.25rem',
      '2xl': '1.563rem',
      '3xl': '1.953rem',
      '4xl': '2.441rem',
      '5xl': '3.052rem',
    }
  }
};

