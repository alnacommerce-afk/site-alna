import { Link } from "@tanstack/react-router";
import { CreditCard, Search, ShieldCheck, ShoppingCart, Truck, User } from "lucide-react";
import { toast } from "sonner";

import logoAlna from "@/assets/brand/logo-alna.jpeg";

const NAV_ITEMS = [
  { label: "HOME", href: "/" },
  { label: "LOJA", href: "#destaques" },
  { label: "CATEGORIAS", href: "#categorias" },
  { label: "SOBRE", href: "#sobre" },
  { label: "CONTATO", href: "#fale-conosco" },
];

function comingSoon() {
  toast.info("Essa área ainda está em construção — em breve por aqui!");
}

export function SiteHeader() {
  return (
    <header className="relative z-30 bg-white shadow-sm">
      <div className="bg-[#16a34a] text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-1.5 text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" /> Frete para todo o Brasil
          </span>
          <span className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> Parcele em até 12x sem juros
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" /> Compra 100% segura
          </span>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" className="shrink-0">
          <img src={logoAlna} alt="Alna Commerce" className="h-10 w-auto" />
        </Link>

        <div className="hidden flex-1 items-center md:flex">
          <div className="relative w-full max-w-md">
            <input
              type="search"
              placeholder="Buscar produtos..."
              className="w-full rounded-md border border-[#12294f]/15 bg-[#fcfbf8] py-2 pl-4 pr-10 text-sm outline-none focus:border-[#12294f]/40"
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <nav className="ml-auto flex items-center gap-4 text-sm font-medium text-[#12294f]">
          <button
            type="button"
            onClick={comingSoon}
            className="hidden items-center gap-1.5 hover:text-[#16a34a] sm:flex"
          >
            <User className="h-4 w-4" /> Minha Conta
          </button>
          <button
            type="button"
            onClick={comingSoon}
            className="flex items-center gap-1.5 hover:text-[#16a34a]"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Carrinho</span> 0
          </button>
        </nav>
      </div>

      <nav className="border-t border-[#12294f]/10">
        <div className="mx-auto flex max-w-6xl items-center gap-6 overflow-x-auto px-4 py-2.5 text-sm font-semibold tracking-wide text-[#12294f]">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="shrink-0 whitespace-nowrap hover:text-[#16a34a]"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  );
}
