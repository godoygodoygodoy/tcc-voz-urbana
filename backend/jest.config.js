export default {
  // Suporte a ESModules
  testEnvironment: "node",
  transform: {},

  // Configuração de testes
  testMatch: ["**/tests/**/*.test.js", "**/tests/**/*.spec.js"],

  // Setup e teardown
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],

  // Cobertura de código
  collectCoverageFrom: ["src/**/*.js", "!src/server.js", "!src/config/**"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],

  // Timeout para testes com banco de dados
  testTimeout: 10000,

  // Limpar mocks automaticamente entre testes
  clearMocks: true,
  restoreMocks: true,

  // Verbose para melhor debug
  verbose: true
};
