import React, { Suspense } from 'react';

const load = name => React.lazy(() => import('./ConversationTools').then(module => ({ default: module[name] })));
const Create = load('CreateConversation');
const Manage = load('ManageConversation');
const Actions = load('MessageActions');

export const CreateConversation = props => <Suspense fallback={null}><Create {...props} /></Suspense>;
export const ManageConversation = props => <Suspense fallback={null}><Manage {...props} /></Suspense>;
export const MessageActions = props => <Suspense fallback={null}><Actions {...props} /></Suspense>;
