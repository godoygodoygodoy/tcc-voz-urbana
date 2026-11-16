import { spawn } from 'node:child_process';
import '../src/config/environment.js';
import { fileURLToPath } from 'node:url';
import { safeMigrate } from './safe-migrate.js';

try {
  await safeMigrate({apply:true});
  // server.js retains assertSchemaReady before listening or starting workers.
  const server=spawn(process.execPath,[fileURLToPath(new URL('../src/server.js',import.meta.url))],{stdio:'inherit',windowsHide:true});
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.kill(signal));
  server.on('error',()=>{console.error('Backend could not start.');process.exitCode=1;});
  server.on('exit',code=>{process.exitCode=code??1;});
}catch(error){console.error(error.message);process.exitCode=1;}
