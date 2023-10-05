import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  publicDir: "static",
  server: {
    port: 8080,
    host: true,
  },
  plugins: [
    glsl(),
    wasm(),
  ],
});
