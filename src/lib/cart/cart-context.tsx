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

export type CartCoupon = { code: string; discountPercent: number; minOrderCents?: number };

/** Most coupons that can be combined in one order; their percentages add up. */
export const MAX_COUPONS = 3;

type CartState = { items: CartItem[]; coupons: CartCoupon[] };

type CartAction =
  | { type: "hydrate"; items: CartItem[]; coupons: CartCoupon[] }
  | { type: "add"; item: Omit<CartItem, "quantity">; quantity: number }
  | { type: "setQuantity"; variantId: string; quantity: number }
  | { type: "remove"; variantId: string }
  | { type: "addCoupon"; coupon: CartCoupon }
  | { type: "removeCoupon"; code: string }
  | { type: "clear" };

const STORAGE_KEY = "alna_cart";

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "hydrate":
      return { items: action.items, coupons: action.coupons };
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
    case "addCoupon": {
      if (state.coupons.length >= MAX_COUPONS) return state;
      if (state.coupons.some((c) => c.code === action.coupon.code)) return state;
      return { ...state, coupons: [...state.coupons, action.coupon] };
    }
    case "removeCoupon":
      return { ...state, coupons: state.coupons.filter((c) => c.code !== action.code) };
    case "clear":
      return { items: [], coupons: [] };
    default:
      return state;
  }
}

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotalCents: number;
  /** Every coupon the customer added (up to MAX_COUPONS), whether or not its minimum order is met yet. */
  coupons: CartCoupon[];
  /** The ones whose minimum order is met: only these discount (and are sent to checkout). */
  eligibleCoupons: CartCoupon[];
  /** Sum of the eligible coupons' percentages. */
  discountPercent: number;
  discountCents: number;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  addCoupon: (coupon: CartCoupon) => void;
  removeCoupon: (code: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], coupons: [] });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          dispatch({ type: "hydrate", items: parsed, coupons: [] });
        } else {
          // Older carts stored a single "coupon"; newer ones store the "coupons" list.
          const stored: CartCoupon[] = Array.isArray(parsed.coupons)
            ? parsed.coupons
            : parsed.coupon
              ? [parsed.coupon]
              : [];
          dispatch({ type: "hydrate", items: parsed.items ?? [], coupons: stored.slice(0, MAX_COUPONS) });
        }
      }
    } catch {
      // ignore malformed/inaccessible storage
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: state.items, coupons: state.coupons }));
    } catch {
      // ignore write failures (private browsing, quota, etc.)
    }
  }, [state.items, state.coupons]);

  const value = useMemo<CartContextValue>(() => {
    const subtotalCents = state.items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
    const eligibleCoupons = state.coupons.filter((c) => subtotalCents >= (c.minOrderCents ?? 0));
    // Percentages add up; the discount can never exceed the order value.
    const discountPercent = Math.min(
      100,
      eligibleCoupons.reduce((sum, c) => sum + c.discountPercent, 0),
    );
    return {
      items: state.items,
      itemCount: state.items.reduce((sum, i) => sum + i.quantity, 0),
      subtotalCents,
      coupons: state.coupons,
      eligibleCoupons,
      discountPercent,
      discountCents: Math.round(subtotalCents * (discountPercent / 100)),
      add: (item, quantity = 1) => dispatch({ type: "add", item, quantity }),
      setQuantity: (variantId, quantity) => dispatch({ type: "setQuantity", variantId, quantity }),
      remove: (variantId) => dispatch({ type: "remove", variantId }),
      addCoupon: (coupon) => dispatch({ type: "addCoupon", coupon }),
      removeCoupon: (code) => dispatch({ type: "removeCoupon", code }),
      clear: () => dispatch({ type: "clear" }),
    };
  }, [state.items, state.coupons]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
