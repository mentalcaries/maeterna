import { defineConfig, lazyPlugins } from "vite-plus"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: lazyPlugins(() => [
    tanstackRouter({
      autoCodeSplitting: true,
      codeSplittingOptions: {
        splitBehavior: ({ routeId }) =>
          routeId === "__root__" ? [] : [["component"]],
      },
    }),
    tailwindcss(),
    viteReact(),
  ]),
  test: {
    include: ["src/**/*.test.ts"],
  },
})

export default config
