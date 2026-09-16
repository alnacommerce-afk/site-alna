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

export type CartCoupon = { code: string; discountPercent: number };

type CartState = { items: CartItem[]; coupon: CartCoupon | null };

type CartAction =
  | { type: "hydrate"; items: CartItem[]; coupon: CartCoupon | null }
  | { type: "add"; item: Omit<CartItem, "quantity">; quantity: number }
  | { type: "setQuantity"; variantId: string; quantity: number }
  | { type: "remove"; variantId: string }
  | { type: "setCoupon"; coupon: CartCoupon | null }
  | { type: "clear" };

const STORAGE_KEY = "alna_cart";

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return { items: action.items, coupon: action.coupon };
    case "add": {
      const existing = state.items.find((i) => i.variantId === action.item.variantId);
      if (existing) {
        const quantity = Math.min(existing.quantity + action.quantity, existing.maxQuantity);
        return {
          ...state,
          items: state.items.map((i) =>
            i.variantId === action.item.variantId ? { ...i, quantity } : i,
          ),
        };
      }
      const quantity = Math.min(action.quantity, action.item.maxQuantity);
      return { ...state, items: [...state.items, { ...action.item, quantity }] };
    }
    case "setQuantity": {
      const quantity = Math.max(1, action.quantity);
      return {
        ...state,
        items: state.items.map((i) =>
          i.variantId === action.variantId
            ? { ...i, quantity: Math.min(quantity, i.maxQuantity) }
            : i,
        ),
      };
    }
    case "remove":
      return { ...state, items: state.items.filter((i) => i.variantId !== action.variantId) };
    case "setCoupon":
      return { ...state, coupon: action.coupon };
    case "clear":
      return { items: [], coupon: null };
    default:
      return state;
  }
}

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  coupon: CartCoupon | null;
  discountCents: number;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  setCoupon: (coupon: CartCoupon | null) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], coupon: null });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          dispatch({ type: "hydrate", items: parsed, coupon: null });
        } else {
          dispatch({ type: "hydrate", items: parsed.items ?? [], coupon: parsed.coupon ?? null });
        }
      }
    } catch {
      // ignore malformed/inaccessible storage
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: state.items, coupon: state.coupon }));
    } catch {
      // ignore write failures (private browsing, quota, etc.)
    }
  }, [state.items, state.coupon]);

  const value = useMemo<CartContextValue>(() => {
    const subtotalCents = state.items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
    return {
      items: state.items,
      itemCount: state.items.reduce((sum, i) => sum + i.quantity, 0),
      subtotalCents,
      coupon: state.coupon,
      discountCents: state.coupon
        ? Math.round(subtotalCents * (state.coupon.discountPercent / 100))
        : 0,
      add: (item, quantity = 1) => dispatch({ type: "add", item, quantity }),
      setQuantity: (variantId, quantity) => dispatch({ type: "setQuantity", variantId, quantity }),
      remove: (variantId) => dispatch({ type: "remove", variantId }),
      setCoupon: (coupon) => dispatch({ type: "setCoupon", coupon }),
      clear: () => dispatch({ type: "clear" }),
    };
  }, [state.items, state.coupon]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
