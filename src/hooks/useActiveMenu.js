import { useLocation } from 'react-router-dom';

/**
 * Menentukan menu sidebar yang aktif dari URL.
 * Menggantikan blok yang sama di kelima layout role.
 */
export default function useActiveMenu(basePath, menuPath, fallback) {
  const { pathname } = useLocation();
  const current = pathname.replace(/\/$/, '');

  const matched = Object.keys(menuPath).find((name) => {
    const slug = menuPath[name];
    return current === `${basePath}/${slug}` || current.startsWith(`${basePath}/${slug}/`);
  });

  const activeMenu = matched || fallback;
  return { activeMenu, activeSlug: menuPath[activeMenu] ?? null, isMatched: Boolean(matched) };
}
