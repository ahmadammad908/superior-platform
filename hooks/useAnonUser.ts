"use client";

import { useState, useEffect } from "react";
import { getAnonymousPersona } from "@/lib/anonUser";

const STORAGE_KEY = "superior_conn_anon_uuid";

export interface AnonUserSession {
  anonUserId: string;
  name: string;
  tag: string;
  badgeColor: string;
  avatarSeed: string;
  resetIdentity: () => void;
}

export function useAnonUser(): AnonUserSession {
  const [anonUserId, setAnonUserId] = useState<string>("");
  const [persona, setPersona] = useState(() => getAnonymousPersona(""));

  useEffect(() => {
    let storedId = localStorage.getItem(STORAGE_KEY);
    if (!storedId) {
      // Generate a secure ephemeral UUID v4
      storedId = "usr_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      localStorage.setItem(STORAGE_KEY, storedId);
    }
    setAnonUserId(storedId);
    setPersona(getAnonymousPersona(storedId));
  }, []);

  const resetIdentity = () => {
    const newId = "usr_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    localStorage.setItem(STORAGE_KEY, newId);
    setAnonUserId(newId);
    setPersona(getAnonymousPersona(newId));
  };

  return {
    anonUserId,
    name: persona.name,
    tag: persona.tag,
    badgeColor: persona.badgeColor,
    avatarSeed: persona.avatarSeed,
    resetIdentity,
  };
}
