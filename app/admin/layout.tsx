import Link from "next/link";
import { BarChart3, Home, Package, ReceiptText, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/orders", label: "Orders", icon: ReceiptText },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/settings", label: "Settings", icon: Settings }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-muted/35">
      <aside className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-2 backdrop-blur lg:inset-y-0 lg:left-0 lg:right-auto lg:w-64 lg:border-r lg:border-t-0 lg:p-4">
        <div className="hidden items-center justify-between lg:flex">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary font-black text-white">A</div>
            <div>
              <p className="text-xs text-muted-foreground">Admin</p>
              <p className="font-black">ARJT Store</p>
            </div>
          </Link>
          <ThemeToggle />
        </div>
        <nav className="grid grid-cols-4 gap-1 lg:mt-8 lg:grid-cols-1">
          {links.map((link) => (
            <Button key={link.href} asChild variant="ghost" className="h-14 flex-col gap-1 lg:h-11 lg:flex-row lg:justify-start">
              <Link href={link.href}>
                <link.icon className="h-5 w-5" />
                <span className="text-xs lg:text-sm">{link.label}</span>
              </Link>
            </Button>
          ))}
        </nav>
        <Button asChild variant="secondary" className="mt-3 hidden w-full justify-start lg:flex">
          <Link href="/">
            <Home className="h-4 w-4" /> Storefront
          </Link>
        </Button>
      </aside>
      <div className="pb-24 lg:pl-64">
        <header className="sticky top-0 z-20 border-b bg-background/90 p-4 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <Link href="/" className="font-black text-primary">ARJT Store Admin</Link>
            <ThemeToggle />
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
