import React from 'react';
import { mediaUrl } from '../services/api';

const Avatar = ({ user, className = '', alt = '', ...props }) => {
  const name = user?.name || user?.nome || user?.username || 'Usuário';
  const image = mediaUrl(user?.avatar || user?.fotoPerfil);
  return image
    ? <img {...props} className={`avatar avatar-image ${className}`} src={image} alt={alt || name} />
    : <span {...props} className={`avatar avatar-fallback ${className}`} aria-label={alt || name}>{name.charAt(0).toUpperCase()}</span>;
};

export default Avatar;
