/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                fami: {
                    green: "#79BF4E",
                    dark: "#0B3D2E",
                    accent: "#48EF32",
                }
            }
        },
    },
    plugins: [],
}
