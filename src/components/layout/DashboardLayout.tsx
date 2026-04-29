import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

type Props = { title: string; subtitle?: string; children: ReactNode };

export function DashboardLayout({ title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen w-full bg-background">
      <Sidebar />
      <div className="ml-64 min-h-screen flex flex-col">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 px-8 py-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
