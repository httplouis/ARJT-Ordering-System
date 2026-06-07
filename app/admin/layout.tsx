"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Package, ReceiptText, Settings, Mail, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";

const links = [
  { href: "/admin" as const, label: "Analytics", icon: BarChart3 },
  { href: "/admin/orders" as const, label: "Orders", icon: ReceiptText },
  { href: "/admin/messages" as const, label: "Messages", icon: Mail },
  { href: "/admin/products" as const, label: "Products", icon: Package },
  { href: "/admin/settings" as const, label: "Settings", icon: Settings }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-muted/35">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:border-r lg:border-muted/20 lg:bg-background/95 lg:p-4 lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-2xl shadow-sm">
                <Image src="/ARJT_LOGO.png" alt="Admin logo" fill sizes="40px" className="object-contain p-1" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Admin</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <Link href={{ pathname: "/profile" }} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
                Profile
              </Link>
              <ThemeToggle />
            </div>
          </div>
          <nav className="mt-8 grid gap-2">
            {links.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/admin" && pathname?.startsWith(`${link.href}/`));
              return (
                <Button
                  key={link.href}
                  asChild
                  variant="ghost"
                  className={`h-12 justify-start gap-3 px-3 ${isActive ? "bg-primary/10 text-primary" : ""}`}
                >
                  <Link href={link.href as any}>
                    <link.icon className="h-5 w-5" />
                    <span className="text-sm">{link.label}</span>
                  </Link>
                </Button>
              );
            })}
          </nav>
        </div>

        <div className="mt-4">
          <LogoutButton className="w-full justify-start" />
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-muted/20 bg-background/95 p-4 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-2xl shadow-sm">
              <Image src="/ARJT_LOGO.png" alt="Admin logo" fill sizes="36px" className="object-contain p-1" />
            </div>
            <Link href="/admin" className="font-black text-primary">Admin</Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => setMenuOpen(true)} aria-label="Open admin menu">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="pb-28 lg:pl-64 lg:px-8">
        {children}
      </div>

      <div
        className={`fixed inset-y-0 right-0 z-50 w-[clamp(16rem,45vw,22rem)] bg-background p-5 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-muted/20 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
            <p className="font-black">Menu</p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setMenuOpen(false)} aria-label="Close admin menu">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="mt-5 space-y-3">
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/admin" && pathname?.startsWith(`${link.href}/`));
            return (
              <Button
                key={link.href}
                asChild
                variant="ghost"
                className={`h-12 w-full justify-start gap-3 px-3 ${isActive ? "bg-primary/10 text-primary" : ""}`}
              >
                <Link href={link.href as any} onClick={() => setMenuOpen(false)}>
                  <link.icon className="h-5 w-5" />
                  <span className="text-sm">{link.label}</span>
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-muted/20 pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">Appearance</span>
            <ThemeToggle />
          </div>
          <LogoutButton className="w-full justify-center" />
        </div>
      </div>

      {menuOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)} />}
    </main>
  );
}
