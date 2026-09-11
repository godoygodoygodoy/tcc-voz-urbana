# 🚀 Iniciando VOZ URBANA - Guia de Configuração

## ✅ O que já está pronto:
- **Frontend**: Landing page, registro e login (design profissional) ✓
- **Backend**: APIs e rotas configuradas ✓  
- **Database**: MySQL local

## ⚠️ Próximo passo: Iniciar o MySQL pelo XAMPP

1. Abra o XAMPP Control Panel.
2. Clique em **Start** na linha **MySQL**. O Apache não é necessário para o backend.
3. Confirme que a porta do MySQL é `3306`.
4. Acesse `http://localhost/phpmyadmin` e crie o banco `voz_urbana` com collation `utf8mb4_unicode_ci`.
5. No arquivo `backend/.env`, use a configuração padrão do XAMPP:
   ```powershell
   DATABASE_URL=mysql://root:@localhost:3306/voz_urbana
   DATABASE_HOST=localhost
   DATABASE_PORT=3306
   DATABASE_USER=root
   DATABASE_PASSWORD=
   DATABASE_NAME=voz_urbana
   ```

## 🔄 Depois de iniciar o banco:

### Terminal 1: Backend
```powershell
cd backend
npm install
copy .env.example .env
npx prisma migrate deploy
npm run prisma:seed
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
Email: o valor de ADMIN_EMAIL no backend/.env
Senha: o valor de ADMIN_PASSWORD no backend/.env
```

## ❓ Problemas?
- **Porta 3000 em uso**: `netstat -ano | findstr :3000` e mate o processo
- **Porta 5000 em uso**: `netstat -ano | findstr :5000` e mate o processo  
- **Banco não conecta**: Verifique o serviço MySQL80 no Windows e confirme a senha da `DATABASE_URL`

---
**Status**: Frontend pronto ✓ | Backend pronto ✓ | Aguardando MySQL local ⏳
