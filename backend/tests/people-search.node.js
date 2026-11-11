import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { createPeopleSearch } from '../src/services/peopleSearch.js';

test('public search includes inactive/unverified registrations and exposes only public fields', async () => {
  const registrations = [
    {id:'1', nome:'Ana Nova', username:'ana.nova', fotoPerfil:'/avatar.png', emailVerificado:false, email:'private@example.com', telefone:'private', problems:[]},
    {id:'2', nome:'Ana Antiga', username:'ana.antiga', fotoPerfil:null, emailVerificado:true, problems:[{}]},
  ];
  const database = {$queryRaw:async statement=>{
    assert.match(statement.sql,/COLLATE utf8mb4_unicode_ci/);
    assert.doesNotMatch(statement.sql,/email|telefone|email_verificado|JOIN/i);
    const term=statement.values[0].slice(1,-1).replace(/!([!%_])/g,'$1').toLowerCase();
    const matched=registrations.filter(user=>[user.nome,user.username].some(value=>value.toLowerCase().includes(term)));
    if(statement.sql.includes('COUNT(*)'))return [{total:BigInt(matched.length)}];
    return matched.slice(statement.values[3],statement.values[3]+statement.values[2]).map(({id,nome,username,fotoPerfil})=>({id,nome,username,fotoPerfil}));
  }};
  const app=express(); app.get('/search', createPeopleSearch(database));
  const response=await request(app).get('/search?q=ANA');
  assert.equal(response.status,200); assert.equal(response.body.total,2);
  assert.deepEqual(Object.keys(response.body.data[0]).sort(),['fotoPerfil','id','nome','username']);
  assert.equal((await request(app).get('/search?q=@ana.no')).body.data[0].id,'1');
  assert.equal((await request(app).get('/search?q=private@example.com')).body.total,0);
  assert.equal((await request(app).get('/search?q=does-not-exist')).body.total,0);
  assert.equal((await request(app).get('/search').query({q:"' OR 1=1 --"})).body.total,0);
  assert.equal((await request(app).get('/search?q=ana&limit=1&page=2')).body.data.length,1);
});
test('empty/short search does not query the database',async()=>{
  const handler=createPeopleSearch({});let result;
  await handler({query:{q:'@a'}},{json:value=>{result=value;}});
  assert.deepEqual(result.data,[]);
});
