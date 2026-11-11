// Windows-only verification harness: restore into a NEW temporary MySQL instance.
// It never creates, drops or imports tables on the application's database server.
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { createBackup, verifyBackup, query, runClient, externalDirectory } from './lib/mysqlTools.js';

let server;
let log;
try {
  if (process.platform !== 'win32' || !process.env.MYSQLD_BIN || !process.env.MYSQL_VERIFY_BIN) throw new Error('Set MYSQLD_BIN and MYSQL_VERIFY_BIN to a local MySQL server/client on Windows.');
  const directory=externalDirectory(process.env.BACKUP_DIR);
  await mkdir(directory,{recursive:true,mode:0o700});
  const scratch=await mkdtemp(path.join(directory,'restore-check-'));
  const data=path.join(scratch,'data');await mkdir(data);
  log=await open(path.join(scratch,'server.log'),'wx',0o600);
  const init=spawn(process.env.MYSQLD_BIN,['--no-defaults','--initialize-insecure','--datadir='+data],{windowsHide:true,stdio:['ignore',log.fd,log.fd]});
  await new Promise((resolve,reject)=>{init.on('error',reject);init.on('exit',code=>code===0?resolve():reject(new Error('Isolated MySQL initialization failed; inspect private server.log.')));});
  const listener=net.createServer();await new Promise(resolve=>listener.listen(0,'127.0.0.1',resolve));const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
  server=spawn(process.env.MYSQLD_BIN,['--no-defaults','--datadir='+data,'--bind-address=127.0.0.1','--port='+port,'--mysqlx=OFF','--event-scheduler=OFF','--skip-log-bin'],{windowsHide:true,stdio:['ignore',log.fd,log.fd]});
  server.on('error',()=>{});
  const url=`mysql://root@127.0.0.1:${port}/audit_restore_check`;
  const previous={bin:process.env.MYSQL_BIN,flavor:process.env.MYSQL_CLIENT_FLAVOR,ssl:process.env.DATABASE_SSL,ca:process.env.DATABASE_SSL_CA};
  // Source uses its original client and TLS settings. Verification is a loopback-only instance.
  const file=process.argv[2] || await createBackup();
  process.env.MYSQL_BIN=process.env.MYSQL_VERIFY_BIN;process.env.MYSQL_CLIENT_FLAVOR='mysql';process.env.DATABASE_SSL='false';delete process.env.DATABASE_SSL_CA;
  for(let attempt=0;;attempt++) {
    try {
      await runClient(process.env.MYSQL_VERIFY_BIN,['--no-defaults','--protocol=TCP','--host=127.0.0.1','--port='+port,'--user=root','--execute=CREATE DATABASE audit_restore_check CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'],{env:{...process.env,MYSQL_PWD:''}});
      break;
    } catch(error) {if(attempt>=30)throw error;await new Promise(resolve=>setTimeout(resolve,500));}
  }
  process.env.BACKUP_VERIFY_DATABASE_URL=url;
  const manifest=await verifyBackup(file);
  console.log(JSON.stringify({event:'backup_restore_verified',backup:file,tables:Object.keys(manifest.tables).length,rows:Object.values(manifest.tables).reduce((a,b)=>a+b,0)}));
  await query(url,'SHUTDOWN');
  process.env.MYSQL_BIN=previous.bin;
} catch(error) {console.error(error.message);process.exitCode=1;}
finally {if(server && server.exitCode===null)server.kill();await log?.close();}
