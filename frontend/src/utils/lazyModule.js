import React from 'react';

export const lazyModule = (loader) => {
  let promise;
  const load = () => promise || (promise = loader().catch(error => { promise = null;throw error; }));
  const Component = React.lazy(load);
  Component.preload = load;
  return Component;
};
