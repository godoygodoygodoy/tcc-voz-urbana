import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {assertSchemaReady} from '../src/services/schemaCompatibility.js';

async function startupImports(environment) {
 const loaded=[];
 const context=vm.createContext({process:{env:{NODE_ENV:environment}}});
 const empty=async()=>{const module=new vm.SyntheticModule([],()=>{},{context});await module.link(()=>{});await module.evaluate();return module;};
 const entry=new vm.SourceTextModule(fs.readFileSync(new URL('../scripts/start.js',import.meta.url),'utf8'),{
  context,importModuleDynamically:async specifier=>{loaded.push(specifier);return empty();},
 });
 await entry.link(async name=>{assert.equal(name,'dotenv/config');return empty();});
 await entry.evaluate();return loaded;
}
test('npm start routes production through the migration gate and keeps local startup direct',async()=>{
 const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url)));
 assert.equal(pkg.scripts.start,'node scripts/start.js');
 assert.deepEqual(await startupImports('production'),['./start-production.js']);
 assert.deepEqual(await startupImports('development'),['../src/server.js']);
 assert.deepEqual(await startupImports(undefined),['../src/server.js']);
});
test('schema startup still rejects missing Story columns and accepts complete metadata',async()=>{
 const {Prisma}=await import('@prisma/client');
 const columns=Prisma.dmmf.datamodel.models.flatMap(model=>model.fields.filter(field=>field.kind!=='object').map(field=>({TABLE_NAME:model.dbName||model.name,COLUMN_NAME:field.dbName||field.name})));
 const incomplete=columns.filter(row=>row.TABLE_NAME!=='stories_respostas'&&!(row.TABLE_NAME==='stories'&&row.COLUMN_NAME==='composicao'));
 await assert.rejects(()=>assertSchemaReady({$queryRaw:async()=>incomplete}),error=>error.code==='SCHEMA_NOT_READY'&&error.missingSchema.some(item=>item.table==='stories_respostas'));
 assert.equal((await assertSchemaReady({$queryRaw:async()=>columns})).compatible,true);
});
