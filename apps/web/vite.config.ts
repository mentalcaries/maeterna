import { defineConfig, lazyPlugins } from "vite-plus"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: lazyPlugins(() => [
    TanStackRouterVite(),
    tailwindcss(),
    viteReact(),
  ]),
  test: {
    include: ["src/**/*.test.ts"],
  },
})

export default config
