"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FullPageLoader } from "@/components/auth/full-page-loader";
import { useAuth } from "@/features/auth/auth-provider";
import { getRoleHome } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();
  const { isReady, user } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    router.replace(user ? getRoleHome(user.role) : "/login");
  }, [isReady, router, user]);

  return <FullPageLoader label="Opening Aampere" />;
}
