import { createFileRoute, redirect } from "@tanstack/react-router";

// The Home page is a standalone static page hosted on Cloudflare (see /home-cloudflare) and serves
// the root domain. This app is the store, so its own "/" just sends visitors to the catalog.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/loja", search: { categoria: undefined }, statusCode: 302 });
  },
});
