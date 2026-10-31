module.exports = {
  extends: ["expo"],
  ignorePatterns: ["/dist/*", "/.expo/*", "/node_modules/*", "/web-build/*"],
  rules: {
    // React Compiler experimental rules (tắt để phù hợp với kiến trúc React Native hiện tại)
    "react-hooks/purity": "off",
    "react-hooks/refs": "off",
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/preserve-manual-memoization": "off",
    "@typescript-eslint/array-type": ["warn", { default: "array" }],
  },
};