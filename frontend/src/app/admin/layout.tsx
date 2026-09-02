import { AppShell } from "@/components/layout/app-shell";
import { RoleGuard } from "@/features/auth/components/role-guard";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <RoleGuard requiredRole="ADMIN">
      <AppShell role="ADMIN">{children}</AppShell>
    </RoleGuard>
  );
}
