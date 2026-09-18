import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationCenter } from "@/components/NotificationCenter";
import { getPageTitle } from "@/lib/navigation";
import { Outlet, useLocation } from "react-router-dom";

export function AppLayout() {
  const { pathname } = useLocation();
  const pageTitle = getPageTitle(pathname);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between gap-4 border-b border-border/60 bg-card/80 backdrop-blur-sm px-4 shrink-0 sticky top-0 z-30">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger />
              {pageTitle && (
                <span className="truncate text-sm font-semibold text-foreground">
                  {pageTitle}
                </span>
              )}
            </div>
            <NotificationCenter />
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {/* A key remonta o wrapper a cada rota, para a animação de entrada
                valer em todas as telas e não só nas três que a declaravam. */}
            <div key={pathname} className="animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
