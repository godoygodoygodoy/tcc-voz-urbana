import React from 'react';
import { useAuthStore } from '../store';
const Actions = React.lazy(() => import('./SocialSafety').then(module => ({
  default: module.SafetyActions
})));
const Center = React.lazy(() => import('./SocialSafety').then(module => ({
  default: module.SafetyCenter
})));
const Queue = React.lazy(() => import('./SocialSafety').then(module => ({
  default: module.ModerationQueue
})));
export function SafetyActions(props) {
  const user = useAuthStore(state => state.user);
  return user ? <React.Suspense fallback={null}><Actions {...props} /></React.Suspense> : null;
}
export function SafetyCenter() {
  return <React.Suspense fallback={null}><Center /></React.Suspense>;
}
export function ModerationQueue() {
  return <React.Suspense fallback={null}><Queue /></React.Suspense>;
}
