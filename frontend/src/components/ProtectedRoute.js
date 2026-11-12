import { shallow } from 'zustand/shallow';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store';

const ProtectedRoute = ({ component: Component, roles }) => {
  const { user } = useAuthStore(state => ({ user: state.user }), shallow);

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return <Component />;
};

export default ProtectedRoute;
