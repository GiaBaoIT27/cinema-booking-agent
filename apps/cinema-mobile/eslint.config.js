// ESLint flat config (ESLint 9). eslint-config-expo cung cấp preset nền cho Expo/TS/React.
// Thêm rule riêng của dự án sau khi spread preset.
const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: ["node_modules/**", ".expo/**", "dist/**", "web-build/**"],
  },
];
