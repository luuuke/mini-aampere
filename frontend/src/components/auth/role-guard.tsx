"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FullPageLoader } from "@/components/auth/full-page-loader";
import { useAuth } from "@/features/auth/auth-provider";
import { getRoleHome, type UserRole } from "@/lib/auth";

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
