"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FullPageLoader } from "@/features/auth/components/full-page-loader";
import { useAuth } from "@/features/auth/auth-provider";
import { getRoleHome } from "@/features/auth/routing";
import type { UserRole } from "@/features/auth/types";

export function RoleGuard({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole: UserRole;
}) {
  const router = useRouter();
  const { isReady, user } = useAuth();
  const isAllowed = isReady && user?.role === requiredRole;

  useEffect(() => {
    if (!isReady || isAllowed) return;
    router.replace(user ? getRoleHome(user.role) : "/login");
  }, [isAllowed, isReady, router, user]);

  if (!isAllowed) return <FullPageLoader label="Checking access" />;
  return children;
}
