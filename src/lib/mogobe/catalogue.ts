"use client";

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export type MogobeProduct = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  unit: "kg" | "pack" | "each";
  imageUrl: string;
  available: boolean;
  sortOrder: number;
  specialPrice?: number;
  specialLabel?: string;
  specialStartsAt?: string;
  specialEndsAt?: string;
};

export type MogobeCartLine = {
  productId: string;
  name: string;
  category: string;
  price: number;
  unit: "kg" | "pack" | "each";
  imageUrl: string;
  quantity: number;
};

export const SEED_PRODUCTS: MogobeProduct[] = [
  { id: "beef-stew", name: "Beef Stew", category: "Beef", description: "Cut for everyday stews and slow cooking.", price: 74.99, unit: "kg", imageUrl: "/mogobe-meat-placeholder.svg", available: true, sortOrder: 1 },
  { id: "beef-cuts", name: "Beef Cuts", category: "Beef", description: "Ask for your preferred cut when checking out.", price: 79.99, unit: "kg", imageUrl: "/mogobe-meat-placeholder.svg", available: true, sortOrder: 2 },
  { id: "beef-mince", name: "Beef Mince", category: "Beef", description: "Versatile mince for family meals.", price: 79.99, unit: "kg", imageUrl: "/mogobe-meat-placeholder.svg", available: true, sortOrder: 3 },
  { id: "mogobe-mix-boroso", name: "Mogobe Mix Boroso", category: "Boroso", description: "Mogobe's mixed sausage selection.", price: 79.99, unit: "kg", imageUrl: "/mogobe-meat-placeholder.svg", available: true, sortOrder: 4 },
  { id: "bbq-boroso", name: "BBQ Boroso", category: "Boroso", description: "BBQ-style boroso for the braai.", price: 85, unit: "kg", imageUrl: "/mogobe-meat-placeholder.svg", available: true, sortOrder: 5 },
  { id: "chakalaka-boroso", name: "Chakalaka Boroso", category: "Boroso", description: "Chakalaka-style boroso for the braai.", price: 85, unit: "kg", imageUrl: "/mogobe-meat-placeholder.svg", available: true, sortOrder: 6 },
  { id: "mateng-offal", name: "Mateng & Offal", category: "Offal", description: "Ask the team to confirm today's selection.", price: 62.99, unit: "kg", imageUrl: "/mogobe-meat-placeholder.svg", available: true, sortOrder: 7 },
  { id: "friday-offal-drop", name: "Friday Offal Drop", category: "Specials", description: "Indicative Friday price; availability and price are confirmed by Mogobe.", price: 54.99, unit: "kg", imageUrl: "/mogobe-meat-placeholder.svg", available: true, sortOrder: 8 }
];

const CART_KEY = "mogobe:cart:v1";

export async function getMogobeProducts(): Promise<MogobeProduct[]> {
  try {
    const snapshot = await getDocs(query(collection(db, "products"), where("available", "==", true)));
    if (snapshot.docs.length) {
      return snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          name: String(data.name ?? "Meat product"),
          category: String(data.category ?? "Other"),
          description: String(data.description ?? ""),
          price: Number(data.price ?? 0),
          unit: data.unit === "pack" || data.unit === "each" ? data.unit : "kg",
          imageUrl: String(data.imageUrl ?? "/mogobe-meat-placeholder.svg"),
          available: data.available === true,
          sortOrder: Number(data.sortOrder ?? 999),
          ...(typeof data.specialPrice === "number" ? { specialPrice: data.specialPrice } : {}),
          ...(typeof data.specialLabel === "string" ? { specialLabel: data.specialLabel } : {}),
          ...(typeof data.specialStartsAt === "string" ? { specialStartsAt: data.specialStartsAt } : {}),
          ...(typeof data.specialEndsAt === "string" ? { specialEndsAt: data.specialEndsAt } : {})
        } satisfies MogobeProduct;
      }).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    }
  } catch (error) {
    console.warn("Using the starter catalogue because live products could not be loaded.", error);
  }
  return SEED_PRODUCTS;
}

export async function getLiveMogobeProducts(): Promise<MogobeProduct[]> {
  const snapshot = await getDocs(query(collection(db, "products"), where("available", "==", true)));
  return snapshot.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      name: String(data.name ?? "Meat product"),
      category: String(data.category ?? "Other"),
      description: String(data.description ?? ""),
      price: Number(data.price ?? 0),
      unit: data.unit === "pack" || data.unit === "each" ? data.unit : "kg",
      imageUrl: String(data.imageUrl ?? "/mogobe-meat-placeholder.svg"),
      available: data.available === true,
      sortOrder: Number(data.sortOrder ?? 999),
      ...(typeof data.specialPrice === "number" ? { specialPrice: data.specialPrice } : {}),
      ...(typeof data.specialLabel === "string" ? { specialLabel: data.specialLabel } : {}),
      ...(typeof data.specialStartsAt === "string" ? { specialStartsAt: data.specialStartsAt } : {}),
      ...(typeof data.specialEndsAt === "string" ? { specialEndsAt: data.specialEndsAt } : {})
    } satisfies MogobeProduct;
  }).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function readMogobeCart(): MogobeCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(CART_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item) =>
      item && typeof item.productId === "string" && typeof item.name === "string" &&
      Number.isFinite(item.price) && Number.isFinite(item.quantity) && item.quantity > 0
    ) as MogobeCartLine[] : [];
  } catch {
    return [];
  }
}

export function writeMogobeCart(lines: MogobeCartLine[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
    window.dispatchEvent(new Event("mogobe-cart-updated"));
  } catch {
    // Keep the storefront usable if local storage is unavailable.
  }
}

export function isProductSpecialActive(product: MogobeProduct, now = Date.now()) {
  if (typeof product.specialPrice !== "number" || product.specialPrice < 0 || product.specialPrice >= product.price) return false;
  const starts = product.specialStartsAt ? new Date(product.specialStartsAt).getTime() : Number.NEGATIVE_INFINITY;
  const ends = product.specialEndsAt ? new Date(product.specialEndsAt).getTime() : Number.POSITIVE_INFINITY;
  return starts <= now && ends >= now;
}

export function currentProductPrice(product: MogobeProduct, now = Date.now()) {
  return isProductSpecialActive(product, now) ? product.specialPrice as number : product.price;
}

export function money(value: number) {
  return new Intl.NumberFormat("en-BW", { style: "currency", currency: "BWP", minimumFractionDigits: 2 }).format(value);
}
