module.exports = {
  preset: "jest-expo",
  testPathIgnorePatterns: ["/node_modules/", "/.expo/"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
};
