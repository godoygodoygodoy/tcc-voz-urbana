#!/usr/bin/env node

/**
 * Script de exemplo para rodar os testes do VOZ URBANA
 * Este arquivo mostra como executar os testes em diferentes cenários
 */

console.log(`
╔═══════════════════════════════════════════════════════════╗
║          🧪 VOZ URBANA - Testes Automatizados             ║
╚═══════════════════════════════════════════════════════════╝

📋 Comandos Disponíveis:

1️⃣  Executar todos os testes:
   npm test

2️⃣  Executar testes em modo watch (desenvolvimento):
   npm run test:watch

3️⃣  Executar com cobertura de código:
   npm run test:coverage

4️⃣  Executar com logs detalhados:
   npm run test:verbose

5️⃣  Executar apenas um arquivo específico:
   npm test -- auth.test.js

6️⃣  Executar testes que correspondem a um padrão:
   npm test -- --testNamePattern="login"

7️⃣  Executar testes de uma suite específica:
   npm test -- --testPathPattern="problems"

⚠️  IMPORTANTE:
   • Os testes usam o mesmo .env do desenvolvimento
   • Os testes limpam o banco entre execuções
   • Execute apenas em ambiente de desenvolvimento local

📊 Visualizar relatório de cobertura:
   Após executar 'npm run test:coverage', abra:
   backend/coverage/index.html

`);
