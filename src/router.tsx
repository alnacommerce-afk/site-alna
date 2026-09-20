import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Start loading a page when the visitor hovers (or touches) its link, and reuse that result for
    // a while, so opening it feels instant.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
