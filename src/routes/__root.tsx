import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "../components/ui/sonner";
import { CartProvider } from "../lib/cart/cart-context";
import { captureReferralCodeFromUrl } from "../lib/referral/referral-code";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/loja"
            search={{ categoria: undefined }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir para a loja
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado do nosso lado. Tente atualizar a página ou voltar para a loja.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar de novo
          </button>
          <a
            href="/loja"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para a loja
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Alna Commerce" },
      { name: "description", content: "Utilidades domésticas para casa, cozinha e mesa." },
      { name: "author", content: "Alna Commerce" },
      { property: "og:title", content: "Alna Commerce" },
      { property: "og:description", content: "Utilidades domésticas para casa, cozinha e mesa." },
      { property: "og:site_name", content: "Alna Commerce" },
      { property: "og:locale", content: "pt_BR" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "facebook-domain-verification", content: "wlsf6qucri9s8y6cqe3ttotjp5ggbr" },
      { name: "google-site-verification", content: "gak-p9ZlkOsjMZQh_IUfqivqBQEWwCW5ar3hn4fn4oY" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      // Brand icon set. "?v=2" makes browsers drop the previous (Lovable) icon from their cache.
      { rel: "icon", href: "/favicon.ico?v=2", sizes: "48x48" },
      { rel: "icon", href: "/favicon-32.png?v=2", type: "image/png", sizes: "32x32" },
      { rel: "icon", href: "/favicon-192.png?v=2", type: "image/png", sizes: "192x192" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png?v=2" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    captureReferralCodeFromUrl();
    // Analytics is not needed for the first paint — run it once the browser is idle.
    // Loaded with a dynamic import so the Supabase client stays out of the entry bundle.
    const runAnalytics = () =>
      void import("../lib/analytics/ga4").then((m) => m.injectGa4IfConfigured());
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(runAnalytics, { timeout: 4000 });
      return () => window.cancelIdleCallback(handle);
    }
    const timeout = window.setTimeout(runAnalytics, 2000);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <Toaster />
      </CartProvider>
    </QueryClientProvider>
  );
}
