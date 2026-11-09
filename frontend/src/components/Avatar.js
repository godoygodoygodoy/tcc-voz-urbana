import React from 'react';
import { mediaUrl } from '../services/api';

const Avatar = ({ user, className = '', alt = '', ...props }) => {
  const name = user?.name || user?.nome || user?.username || 'Usuário';
  const image = mediaUrl(user?.avatar || user?.fotoPerfil);
  const initial = name.trim().charAt(0).toUpperCase() || 'U';
  return image
    ? <img {...props} className={`avatar avatar-image ${className}`} src={image} alt={alt || name} />
    : <span {...props} className={`avatar avatar-fallback ${className}`} aria-label={alt || name}>{initial}</span>;
};

export default Avatar;
