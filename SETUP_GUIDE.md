# 🚀 Iniciando VOZ URBANA - Guia de Configuração

## ✅ O que já está pronto:
- **Frontend**: Landing page, registro e login (design profissional) ✓
- **Backend**: APIs e rotas configuradas ✓  
- **Database**: PostgreSQL configurado no Docker Compose

## ⚠️ Próximo passo: Iniciar o PostgreSQL

### Opção 1: Docker Desktop (Recomendado)
1. **Abra o Docker Desktop** manualmente:
   - Procure por "Docker Desktop" no menu Iniciar do Windows
   - Aguarde 30-60 segundos para ele inicializar completamente

2. **Em seguida, no PowerShell (na raiz do projeto):**
   ```powershell
   docker compose up -d
   ```

3. **Verifique se está rodando:**
   ```powershell
   docker ps
   ```

### Opção 2: PostgreSQL Local (sem Docker)
1. Instale PostgreSQL no Windows em `C:\Program Files\PostgreSQL`
2. Use `psql` para criar o banco:
   ```sql
   CREATE DATABASE voz_urbana;
   ```

3. Atualize `.env` do backend para apontar para o local PostgreSQL

## 🔄 Depois de iniciar o banco:

### Terminal 1: Backend
```powershell
cd backend
npm run dev
```
Será iniciado em: `http://localhost:5000`

### Terminal 2: Frontend (já está rodando)
Se caiu, reinicie:
```powershell
cd frontend
npm start
```
Acesse em: `http://localhost:3000`

## 🧪 Testar o sistema:
1. Abra `http://localhost:3000`
2. Clique em "Cadastre-se" 
3. Preencha o formulário e crie uma conta
4. Faça login
5. Reporte um problema!

## 📝 Credenciais de teste:
```
Email: test@example.com
Senha: 123456
```

## ❓ Problemas?
- **Porta 3000 em uso**: `netstat -ano | findstr :3000` e mate o processo
- **Porta 5000 em uso**: `netstat -ano | findstr :5000` e mate o processo  
- **Docker não abre**: Certifique-se de que Docker Desktop está instalado
- **Banco não conecta**: Verifique se PostgreSQL está rodando com `docker ps`

---
**Status**: Frontend pronto ✓ | Backend pronto ✓ | Aguardando PostgreSQL ⏳
