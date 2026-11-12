import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/middlewares/auth.js', import.meta.url), 'utf8');
async function middleware(admin) {
  const context=vm.createContext({});
  const module=new vm.SourceTextModule(source,{context});
  await module.link(async specifier=>{
    const stub=specifier==='jsonwebtoken'
      ?new vm.SyntheticModule(['default'],function(){this.setExport('default',{});},{context})
      :new vm.SyntheticModule(['prisma'],function(){this.setExport('prisma',{admin:{findUnique:async({where})=>{assert.equal(where.usuarioId,7);return admin;}}});},{context});
    return stub;
  });
  await module.evaluate();return module.namespace.adminMiddleware;
}
for(const [name,userId,admin,expected] of [
 ['anonymous',undefined,null,401],['ordinary user',7,null,403],['administrator',7,{nivel:'ADMIN'},200],['super administrator',7,{nivel:'SUPER_ADMIN'},200],
])test(`administration access: ${name}`,async()=>{
 const handler=await middleware(admin);const req={userId,userRole:'admin'};let status=200,called=false;
 const res={status(value){status=value;return this;},json(){return this;}};
 await handler(req,res,()=>{called=true;});assert.equal(status,expected);assert.equal(called,expected===200);
 if(admin)assert.equal(req.adminLevel,admin.nivel);
});
test('all administration endpoints remain behind server authentication and database authorization',async()=>{
 const server=await readFile(new URL('../src/server.js',import.meta.url),'utf8');
 assert.match(server,/app\.use\("\/api\/admin",\s*authMiddleware,\s*adminMiddleware,\s*adminRoutes\)/);
});

test('an image-only JWT cannot be reused as an account authentication token',async()=>{
 const context=vm.createContext({process:{env:{JWT_SECRET:'fixture'}}});
 const module=new vm.SourceTextModule(source,{context});
 let databaseRead=false;
 await module.link(async specifier=>specifier==='jsonwebtoken'
  ?new vm.SyntheticModule(['default'],function(){this.setExport('default',{verify:()=>({imageId:'image-1',viewerId:'user-1',aud:'publication-image'})});},{context})
  :new vm.SyntheticModule(['prisma'],function(){this.setExport('prisma',{usuario:{findUnique:async()=>{databaseRead=true;throw Error('image tickets must be rejected before account lookup');}}});},{context}));
 await module.evaluate();let status=200,nextCalled=false;
 const res={status(value){status=value;return this;},json(){return this;}};
 await module.namespace.authMiddleware({headers:{authorization:'Bearer image-ticket'}},res,()=>{nextCalled=true;});
 assert.equal(status,401);assert.equal(nextCalled,false);assert.equal(databaseRead,false);
});
