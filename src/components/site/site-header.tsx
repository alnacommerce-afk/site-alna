import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  CreditCard,
  Gift,
  Menu,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  User,
  X,
} from "lucide-react";
import { useCategories, useSiteSettings } from "@/lib/site-data";
import { SITE_URL } from "@/lib/site-urls";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCentsToBRL } from "@/lib/money";
import { useCart } from "@/lib/cart/cart-context";
import logoAlna from "@/assets/brand/logo-alna.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const { itemCount } = useCart();
  const { data: categories = [], isLoading: loadingCategories } = useCategories();
  const { data: settings, isLoading: loadingSettings } = useSiteSettings();
  const freeShippingThresholdCents = settings?.free_shipping_threshold_cents ?? null;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-30 bg-white shadow-sm">
      <div className="bg-[#15803d] text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-1.5 text-xs font-medium">
          {loadingSettings ? (
            <Skeleton className="h-3.5 w-52 bg-white/25" />
          ) : freeShippingThresholdCents ? (
            <span className="reveal flex items-center gap-1.5 font-bold">
              <Gift className="h-3.5 w-3.5" /> Frete grátis em compras acima de{" "}
              {formatCentsToBRL(freeShippingThresholdCents)}
            </span>
          ) : null}
          <span className="hidden items-center gap-1.5 sm:flex">
            <Truck className="h-3.5 w-3.5" /> Frete para todo o Brasil
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <CreditCard className="h-3.5 w-3.5" /> Parcele em até 12x no cartão
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" /> Compra 100% segura
          </span>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <a href={SITE_URL} className="shrink-0">
          <img src={logoAlna} alt="ALNA" width={97} height={40} className="h-10 w-auto" />
        </a>

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
          <Link
            to="/conta"
            className="hidden items-center gap-1.5 hover:text-[#15803d] sm:flex"
          >
            <User className="h-4 w-4" /> Minha Conta
          </Link>
          <Link
            to="/carrinho"
            className="flex items-center gap-1.5 hover:text-[#15803d]"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Carrinho</span> {itemCount}
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e2e8f0] bg-white text-[#12294f] md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
      </div>

      <nav
        id="site-menu"
        aria-label="Principal"
        className={`border-t border-[#12294f]/10 ${menuOpen ? "block" : "hidden"} md:block`}
      >
        <div className="mx-auto flex max-w-6xl flex-col px-4 text-sm font-semibold tracking-wide text-[#12294f] md:flex-row md:items-center md:justify-start md:gap-6 md:py-2.5">
          <a
            href={SITE_URL}
            className="whitespace-nowrap border-b border-[#12294f]/10 py-3 hover:text-[#15803d] md:border-0 md:py-0"
          >
            HOME
          </a>
          <Link
            to="/loja"
            search={{ categoria: undefined }}
            className="whitespace-nowrap border-b border-[#12294f]/10 py-3 hover:text-[#15803d] md:border-0 md:py-0"
          >
            LOJA
          </Link>
          <a
            href={`${SITE_URL}/atacado`}
            className="whitespace-nowrap border-b border-[#12294f]/10 py-3 hover:text-[#15803d] md:border-0 md:py-0"
          >
            ATACADO
          </a>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 whitespace-nowrap border-b border-[#12294f]/10 py-3 text-left outline-none hover:text-[#15803d] md:border-0 md:py-0">
              CATEGORIAS
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {loadingCategories ? (
                <DropdownMenuItem disabled>Carregando...</DropdownMenuItem>
              ) : categories.length === 0 ? (
                <DropdownMenuItem disabled>Nenhuma categoria ainda</DropdownMenuItem>
              ) : (
                categories.map((category) => (
                  <DropdownMenuItem key={category.id} asChild>
                    <Link to="/loja" search={{ categoria: category.slug }}>
                      {category.name}
                    </Link>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/loja" search={{ categoria: undefined }}>
                  Ver todas as categorias
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            to="/sobre"
            className="whitespace-nowrap border-b border-[#12294f]/10 py-3 hover:text-[#15803d] md:border-0 md:py-0"
          >
            SOBRE
          </Link>
          <Link
            to="/contato"
            className="whitespace-nowrap py-3 hover:text-[#15803d] md:py-0"
          >
            CONTATO
          </Link>
        </div>
      </nav>
    </header>
  );
}
