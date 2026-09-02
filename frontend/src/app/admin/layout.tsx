import { RoleGuard } from "@/components/auth/role-guard";
import { AppShell } from "@/components/layout/app-shell";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <RoleGuard requiredRole="ADMIN">
      <AppShell role="ADMIN">{children}</AppShell>
    </RoleGuard>
  );
}
