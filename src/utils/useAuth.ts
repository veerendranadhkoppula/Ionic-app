import React from "react";
import { getCurrentUser, hydrateCurrentUser } from "./authStorage";
import tokenStorage from "./tokenStorage";

export function useAuth() {
  const [user, setUser] = React.useState<unknown | null>(() => getCurrentUser());
  const [isLoggedIn, setIsLoggedIn] = React.useState<boolean>(() => {
    try {
      const token = localStorage.getItem("app_jwt_token");
      return !!token && getCurrentUser()?.isGuest !== true;
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    let mounted = true;

    const sync = async () => {
      try {
        const hydrated = await hydrateCurrentUser();
        if (!mounted) return;
        setUser(hydrated);
        const token = await tokenStorage.getToken();
        setIsLoggedIn(!!token && hydrated?.isGuest !== true);
      } catch {
        if (!mounted) return;
        setUser(getCurrentUser());
        tokenStorage.getToken().then((t) => setIsLoggedIn(!!t));
      }
    };

    sync();

    const handler = () => {
      const u = getCurrentUser();
      setUser(u);
      tokenStorage.getToken().then((t) => setIsLoggedIn(!!t && u?.isGuest !== true));
    };
    window.addEventListener("auth-changed", handler);
    return () => {
      mounted = false;
      window.removeEventListener("auth-changed", handler);
    };
  }, []);

  return { user, isLoggedIn } as const;
}

export default useAuth;
