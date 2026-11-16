import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import Avatar from './Avatar';
import { profilePath } from '../utils/profileLinks';
import { getLanguage, translateSystemText, useI18n } from '../i18n';
import {formatRelativeTime} from '../utils/relativeTime';

const actorTypes=new Set(['NOVO_SEGUIDOR','SEGUIR_SOLICITACAO','SEGUIR_ACEITA','AMIZADE_SOLICITACAO','AMIZADE_ACEITA','VOTO','COMENTARIO','RESPOSTA','MENCAO','MENSAGEM','STORY','ACOMPANHAMENTO','STATUS','CONFIRMACAO']);
export default function NotificationItem({item,onOpen,onActorOpen,compact=false}) {
  const {t}=useI18n(),actor=item.actor;
  const actorLabel=actor?.nome||actor?.username||t(item.actorStatus==='restricted'?'notificationActorRestricted':'notificationActorUnavailable');
  const hasAction=actorTypes.has(item.tipo);
  const description=actor&&hasAction?t(item.tipo==='MENCAO'&&item.mensagem==='storyMentionBody'?'storyMentionBody':'notificationAction'+item.tipo):translateSystemText(item.mensagem);
  const date=new Date(item.dataCriacao),validDate=Number.isFinite(+date);
  const elapsed=validDate?formatRelativeTime(date,getLanguage()):t('now');
  const openActor=event=>{event.stopPropagation();onActorOpen?.();};
  return <div className={'feed-notification notification-item'+(compact?' notification-item--compact':'')+(item.lida?'':' is-unread')} onClick={()=>onOpen(item)}>
    {actor?<Link className="notification-avatar" to={profilePath(actor)} onClick={openActor} aria-label={actorLabel}><Avatar user={actor} width="40" height="40" /></Link>
      :hasAction?<Avatar className="notification-avatar" alt={actorLabel} width="40" height="40" />:<span className="feed-notification-icon"><Bell size={15}/></span>}
    <div className="notification-copy">
      <span className="notification-title">{translateSystemText(item.titulo)}</span>
      {hasAction&&<div className="notification-identity">{actor?<Link to={profilePath(actor)} onClick={openActor}><strong>{actorLabel}</strong>{actor.username&&<small>@{actor.username.replace(/^@+/,'')}</small>}</Link>:<strong className="site-muted">{actorLabel}</strong>}</div>}
      <button type="button" className="notification-action" onClick={event=>{event.stopPropagation();onOpen(item);}}>
        <span>{description}</span>
        {actor&&['STATUS','ACOMPANHAMENTO'].includes(item.tipo)&&<span>{translateSystemText(item.mensagem)}</span>}
        <time dateTime={validDate?date.toISOString():undefined}>{elapsed}</time>
      </button>
    </div>
  </div>;
}
