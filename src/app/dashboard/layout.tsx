import Sidebar from "@/components/Sidebar";
import { ModelStatusProvider } from "@/context/ModelStatusContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModelStatusProvider>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--ghost-bg)" }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: "auto", minWidth: 0, background: "var(--ghost-bg)" }}>
          {children}
        </main>
      </div>
    </ModelStatusProvider>
  );
}
