import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const config = [
  { ignores: [".next/**", "node_modules/**", "fixtures/**", "next-env.d.ts"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettier,
];

export default config;
