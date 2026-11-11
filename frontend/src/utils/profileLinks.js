export const profilePath = (user) => {
  const username = user?.username?.replace(/^@/, '').trim();
  return username ? `/${encodeURIComponent(username)}` : `/profile/${user?.id}`;
};
