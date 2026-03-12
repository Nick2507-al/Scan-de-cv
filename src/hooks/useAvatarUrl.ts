import { useEffect, useRef, useState } from "react";
import { apiUrl, getStoredToken } from "../api/config";

/**
 * Récupère l'URL blob de la photo de profil (authentification requise).
 * À utiliser pour afficher l'avatar dans le header ou la page profil.
 */
export function useAvatarUrl(avatarPath: string | undefined): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const currentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!avatarPath || !avatarPath.trim()) {
      if (currentRef.current) {
        URL.revokeObjectURL(currentRef.current);
        currentRef.current = null;
      }
      setBlobUrl(null);
      return;
    }
    const token = getStoredToken();
    if (!token) {
      setBlobUrl(null);
      return;
    }
    if (currentRef.current) {
      URL.revokeObjectURL(currentRef.current);
      currentRef.current = null;
    }
    let cancelled = false;
    fetch(apiUrl("/api/users/me/avatar"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (cancelled || !blob) return;
        const url = URL.createObjectURL(blob);
        currentRef.current = url;
        setBlobUrl(url);
      })
      .catch(() => setBlobUrl(null));
    return () => {
      cancelled = true;
      if (currentRef.current) {
        URL.revokeObjectURL(currentRef.current);
        currentRef.current = null;
      }
      setBlobUrl(null);
    };
  }, [avatarPath]);

  return blobUrl;
}
