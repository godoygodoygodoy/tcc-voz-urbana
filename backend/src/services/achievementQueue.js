import { prisma } from '../config/prisma.js';
import { createAchievements } from './achievements.js';
import { announceNotification } from '../utils/notifications.js';
export const achievementService=createAchievements(prisma);
const queued=new Set();let timer,running=false,stopped=false;
const schedule=()=>{if(!stopped&&!running&&!timer&&queued.size){timer=setTimeout(run,150);timer.unref?.();}};
async function run(){
  timer=null;running=true;
  const users=[...queued].slice(0,2);for(const id of users)queued.delete(id);
  await Promise.all(users.map(async userId=>{
    try{for(const notification of await achievementService.reconcile(userId,{force:true}))void announceNotification(notification).catch(()=>{});}
    catch(error){console.error(JSON.stringify({event:'achievement_check_pending',code:error.code||error.name}));}
  }));
  running=false;schedule();
}
export function queueAchievementCheck(userId){if(!stopped&&userId&&queued.size<1000){queued.add(userId);schedule();}}
export function stopAchievementChecks(){stopped=true;clearTimeout(timer);timer=null;queued.clear();}
