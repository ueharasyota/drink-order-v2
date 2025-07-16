// src/data/menuItems.ts

export type DrinkItem = {
  name: string;
  price: number;
  type: "アイス" | "ホット";
};

export const menuItems: DrinkItem[] = [
  // アイス（300円）
  { name: "コーヒー", price: 300, type: "アイス" },
  { name: "カフェオレ", price: 300, type: "アイス" },
  { name: "ミックスジュース", price: 300, type: "アイス" },
  { name: "ココア", price: 300, type: "アイス" },
  { name: "ハニーレモン", price: 300, type: "アイス" },
  { name: "抹茶オーレ", price: 300, type: "アイス" },
  { name: "イチゴオーレ", price: 300, type: "アイス" },
  { name: "アイスティー", price: 300, type: "アイス" },
  { name: "ミルクティー", price: 300, type: "アイス" },
  { name: "美酢(ザクロ)", price: 300, type: "アイス" },
  { name: "美酢(マスカット)", price: 300, type: "アイス" },
  { name: "美酢(レモン)", price: 300, type: "アイス" },
  { name: "オレンジ", price: 300, type: "アイス" },
  { name: "アップル", price: 300, type: "アイス" },
  { name: "マンゴー", price: 300, type: "アイス" },

  // ホット（300円）
  { name: "コーヒー", price: 300, type: "ホット" },
  { name: "カフェオレ", price: 300, type: "ホット" },
  { name: "ココア", price: 300, type: "ホット" },
  { name: "紅茶", price: 300, type: "ホット" },
  { name: "昆布茶", price: 300, type: "ホット" },
  { name: "梅昆布茶", price: 300, type: "ホット" },
  { name: "オニオンスープ", price: 300, type: "ホット" },
  { name: "コーンポタージュ", price: 300, type: "ホット" },
  { name: "ポタージュ", price: 300, type: "ホット" },

  // ホット（500円）
  { name: "プレミアムコーヒー", price: 500, type: "ホット" },
];
