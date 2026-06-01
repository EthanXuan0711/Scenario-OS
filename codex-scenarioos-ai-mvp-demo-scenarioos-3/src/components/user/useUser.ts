"use client";

// 本地用户状态（localStorage 持久化，纯前端 demo，将来可平滑替换为真实后端鉴权）。

import { useCallback, useEffect, useState } from "react";
import { emptyBirth, type UserProfile } from "./userTypes";

const STORAGE_KEY = "scenarioos.user.v1";

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 仅客户端读取，避免 SSR/水合问题。
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as UserProfile);
    } catch {
      // ignore corrupted storage
    }
    setLoaded(true);
  }, []);

  const write = useCallback((next: UserProfile | null) => {
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore quota / privacy mode
    }
  }, []);

  const login = useCallback(
    (nickname: string) => {
      const now = Date.now();
      const profile: UserProfile = {
        id: `u-${now.toString(36)}`,
        nickname: nickname.trim() || "用户",
        gender: "other",
        birth: emptyBirth(),
        email: "",
        bio: "",
        createdAt: now,
        updatedAt: now
      };
      setUser(profile);
      write(profile);
    },
    [write]
  );

  const logout = useCallback(() => {
    setUser(null);
    write(null);
  }, [write]);

  const updateProfile = useCallback(
    (partial: Partial<UserProfile>) => {
      setUser((current) => {
        if (!current) return current;
        const next: UserProfile = { ...current, ...partial, updatedAt: Date.now() };
        write(next);
        return next;
      });
    },
    [write]
  );

  return { user, isLoggedIn: Boolean(user), loaded, login, logout, updateProfile };
}
