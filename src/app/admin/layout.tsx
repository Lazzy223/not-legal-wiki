import type { ReactNode } from "react";
import AdminNavigationPanel from "@/components/admin-navigation-panel";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <>
      <AdminNavigationPanel />
      {children}
    </>
  );
}
