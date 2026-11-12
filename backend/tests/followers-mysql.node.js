import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prepareTestDatabase } from '../src/config/testDatabaseSafety.js';
import { createSocialGraph } from '../src/services/socialGraph.js';
import { createMessaging } from '../src/services/messaging.js';

// Opt-in only: never connects to the application database or creates/resets a database.
test('MySQL row locks enforce independent cumulative quotas under concurrent HTTP-equivalent sends', {
 skip: !process.env.TEST_DATABASE_URL ? 'Configure an isolated TEST_DATABASE_URL and explicit cleanup authorization.' : false,
}, async () => {
 prepareTestDatabase();
 const { prisma } = await import('../src/config/prisma.js');
 const ids=[randomUUID(),randomUUID()];
 let created = false;
 try {
  await prisma.usuario.createMany({data:ids.map((id,index)=>({id,nome:`Isolated follow test ${index}`,email:`${id}@example.invalid`,senhaHash:'not-a-login-hash',perfilPrivado:false}))});
  created = true;
  const graph=createSocialGraph(prisma),chat=createMessaging(prisma);
  const [a,b]=ids;const conversation=await chat.open(a,b);
  const results=await Promise.allSettled(Array.from({length:10},(_,i)=>chat.send(a,conversation.id,`Concurrent message ${i}`)));
  assert.equal(results.filter(result=>result.status==='fulfilled').length,3);
  assert.equal(await prisma.mensagem.count({where:{conversaId:conversation.id,remetenteId:a}}),3);
  assert.equal((await chat.history(b,conversation.id)).messaging.remaining,3);
  await graph.follow(a,b);await graph.follow(b,a);
  await chat.send(a,conversation.id,'Unlocked after mutual following');
  await graph.unfollow(b,a);
  await assert.rejects(chat.send(a,conversation.id,'No reset'),{code:'MESSAGE_LIMIT_REACHED'});
  assert.equal((await chat.history(a,conversation.id)).messages.length,4);
 } finally {
  // Only the UUIDs created by this test; related test rows cascade. No table cleanup.
  if (created) await prisma.usuario.deleteMany({where:{id:{in:ids}}});
  await prisma.$disconnect();
 }
});
