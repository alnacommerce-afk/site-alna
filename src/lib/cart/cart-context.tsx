import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";

export type CartItem = {
  variantId: string;
  productSlug: string;
  productTitle: string;
  variantName: string;
  thumbnailUrl: string | null;
  priceCents: number;
  quantity: number;
  maxQuantity: number;
};

type CartState = { items: CartItem[] };

type CartAction =
  | { type: "hydrate"; items: CartItem[] }
  | { type: "add"; item: Omit<CartItem, "quantity">; quantity: number }
  | { type: "setQuantity"; variantId: string; quantity: number }
  | { type: "remove"; variantId: string }
  | { type: "clear" };

const STORAGE_KEY = "alna_cart";

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return { items: action.items };
    case "add": {
      const existing = state.items.find((i) => i.variantId === action.item.variantId);
      if (existing) {
        const quantity = Math.min(existing.quantity + action.quantity, existing.maxQuantity);
        return {
          items: state.items.map((i) =>
            i.variantId === action.item.variantId ? { ...i, quantity } : i,
          ),
        };
      }
      const quantity = Math.min(action.quantity, action.item.maxQuantity);
      return { items: [...state.items, { ...action.item, quantity }] };
    }
    case "setQuantity": {
      const quantity = Math.max(1, action.quantity);
      return {
        items: state.items.map((i) =>
          i.variantId === action.variantId
            ? { ...i, quantity: Math.min(quantity, i.maxQuantity) }
            : i,
        ),
      };
    }
    case "remove":
      return { items: state.items.filter((i) => i.variantId !== action.variantId) };
    case "clear":
      return { items: [] };
    default:
      return state;
  }
}

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "hydrate", items: JSON.parse(raw) });
    } catch {
      // ignore malformed/inaccessible storage
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // ignore write failures (private browsing, quota, etc.)
    }
  }, [state.items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items: state.items,
      itemCount: state.items.reduce((sum, i) => sum + i.quantity, 0),
      subtotalCents: state.items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0),
      add: (item, quantity = 1) => dispatch({ type: "add", item, quantity }),
      setQuantity: (variantId, quantity) => dispatch({ type: "setQuantity", variantId, quantity }),
      remove: (variantId) => dispatch({ type: "remove", variantId }),
      clear: () => dispatch({ type: "clear" }),
    }),
    [state.items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
