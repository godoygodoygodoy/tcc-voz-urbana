const formatters=new Map();
export function formatRelativeTime(value,language){
  const date=new Date(value);if(!Number.isFinite(+date))return null;
  const seconds=(+date-Date.now())/1000;
  const [unit,size]=[['year',31536000],['month',2592000],['day',86400],['hour',3600],['minute',60],['second',1]].find(([,size])=>Math.abs(seconds)>=size)||['second',1];
  if(!formatters.has(language))formatters.set(language,new Intl.RelativeTimeFormat(language,{numeric:'auto'}));
  return formatters.get(language).format(Math.round(seconds/size),unit);
}
