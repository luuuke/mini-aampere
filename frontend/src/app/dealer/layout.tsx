import { RoleGuard } from "@/components/auth/role-guard";
import { AppShell } from "@/components/layout/app-shell";

export default function DealerLayout({ children }: LayoutProps<"/dealer">) {
  return (
    <RoleGuard requiredRole="DEALER">
      <AppShell role="DEALER">{children}</AppShell>
    </RoleGuard>
  );
}
