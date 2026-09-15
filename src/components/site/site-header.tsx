import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  CreditCard,
  Gift,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
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

type CategoryLink = { id: string; name: string; slug: string };

function comingSoon() {
  toast.info("Essa área ainda está em construção — em breve por aqui!");
}

export function SiteHeader() {
  const [categories, setCategories] = useState<CategoryLink[]>([]);
  const { itemCount } = useCart();
  const [freeShippingThresholdCents, setFreeShippingThresholdCents] = useState<number | null>(
    null,
  );

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name, slug")
      .order("position")
      .then(({ data }) => setCategories(data ?? []));

    supabase
      .from("site_settings")
      .select("free_shipping_threshold_cents")
      .eq("id", "default")
      .maybeSingle()
      .then(({ data }) => setFreeShippingThresholdCents(data?.free_shipping_threshold_cents ?? null));
  }, []);

  return (
    <header className="relative z-30 bg-white shadow-sm">
      <div className="bg-[#16a34a] text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-1.5 text-xs font-medium">
          {freeShippingThresholdCents ? (
            <span className="flex items-center gap-1.5 font-bold">
              <Gift className="h-3.5 w-3.5" /> Frete grátis em compras acima de{" "}
              {formatCentsToBRL(freeShippingThresholdCents)}
            </span>
          ) : null}
          <span className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" /> Frete para todo o Brasil
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
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
          <Link
            to="/carrinho"
            className="flex items-center gap-1.5 hover:text-[#16a34a]"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Carrinho</span> {itemCount}
          </Link>
        </nav>
      </div>

      <nav className="border-t border-[#12294f]/10">
        <div className="mx-auto flex max-w-6xl items-center gap-6 overflow-x-auto px-4 py-2.5 text-sm font-semibold tracking-wide text-[#12294f]">
          <Link to="/" className="shrink-0 whitespace-nowrap hover:text-[#16a34a]">
            HOME
          </Link>
          <Link
            to="/loja"
            search={{ categoria: undefined }}
            className="shrink-0 whitespace-nowrap hover:text-[#16a34a]"
          >
            LOJA
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex shrink-0 items-center gap-1 whitespace-nowrap outline-none hover:text-[#16a34a]">
              CATEGORIAS
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {categories.length === 0 ? (
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

          <a href="/#sobre" className="shrink-0 whitespace-nowrap hover:text-[#16a34a]">
            SOBRE
          </a>
          <a href="/#fale-conosco" className="shrink-0 whitespace-nowrap hover:text-[#16a34a]">
            CONTATO
          </a>
        </div>
      </nav>
    </header>
  );
}
