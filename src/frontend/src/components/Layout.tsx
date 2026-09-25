import { Link, useRouterState } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { BookOpen, Receipt, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { to: "/penjualan", label: "Penjualan", icon: Receipt },
  { to: "/master", label: "Master Barang", icon: BookOpen },
  { to: "/laporan", label: "Laporan", icon: TrendingUp },
] as const;

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card shadow-subtle">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary font-display text-lg font-bold text-primary-foreground"
            >
              M
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-base font-bold leading-tight tracking-tight text-foreground sm:text-lg">
                Toko Madanigsih Stationery
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                Jl. Belakang Terminal Pakupatan Serang
              </p>
            </div>
          </div>

          <nav aria-label="Navigasi utama" className="-mx-1 overflow-x-auto">
            <ul className="flex items-center gap-1 px-1">
              {NAV_ITEMS.map((item) => {
                const active = pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      data-ocid={`nav.${item.to.replace("/", "")}_link`}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-smooth",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                        active
                          ? "bg-primary text-primary-foreground shadow-subtle"
                          : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-border bg-secondary">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} Toko Madanigsih Stationery · Jl.
            Belakang Terminal Pakupatan Serang
          </p>
          <p>
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                window.location.hostname,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 transition-smooth hover:text-foreground"
            >
              Built with love using caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
