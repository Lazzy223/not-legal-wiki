"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type HomeAdminButtonProps = {
  className?: string;
  children?: ReactNode;
};

export default function HomeAdminButton({
  className,
  children = "Админ-панель",
}: HomeAdminButtonProps) {
  const [visible, setVisible] = useState(false);

  const checkAccess = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      setVisible(Boolean(response.ok && data?.user?.canOpenAdmin));
    } catch {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    checkAccess();

    window.addEventListener("nlrp-auth-changed", checkAccess);

    return () => {
      window.removeEventListener("nlrp-auth-changed", checkAccess);
    };
  }, [checkAccess]);

  if (!visible) {
    return null;
  }

  return (
    <Link href="/admin" className={className}>
      {children}
    </Link>
  );
}
