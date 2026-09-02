import { AppShell } from "@/components/layout/app-shell";
import { RoleGuard } from "@/features/auth/components/role-guard";

export default function DealerLayout({ children }: LayoutProps<"/dealer">) {
  return (
    <RoleGuard requiredRole="DEALER">
      <AppShell role="DEALER">{children}</AppShell>
    </RoleGuard>
  );
}
