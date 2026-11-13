// Storage path ownership is checked separately from URL rendering.
export function storedObjectLocation(url, supabaseUrl) {
  if(typeof url!=='string')return null;
  if(url.startsWith('/uploads/')){
    try{const path=decodeURIComponent(url.slice('/uploads/'.length));if(path.includes('\\'))return null;const parts=path.split('/');if(parts.length!==3||parts.some(part=>!part||part==='.'||part==='..'))return null;return{bucket:parts[0],path:parts.slice(1).join('/')};}catch{return null;}
  }
  if(!supabaseUrl)return null;
  try{
    const parsed=new URL(url),base=new URL(supabaseUrl);
    if(parsed.origin!==base.origin)return null;
    const match=/^\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/.exec(parsed.pathname);
    if(!match)return null;const path=decodeURIComponent(match[2]);if(path.includes('\\'))return null;const parts=path.split('/');if(parts.some(part=>!part||part==='.'||part==='..'))return null;
    return{bucket:match[1],path};
  }catch{return null;}
}
export function isOwnedObject(url,bucket,ownerId,supabaseUrl){
  const object=storedObjectLocation(url,supabaseUrl);if(!object||object.bucket!==bucket)return false;
  const parts=object.path.split('/');return parts.length===2&&parts[0]===ownerId;
}
