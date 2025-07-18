// src/data/menuItems.ts

export type DrinkItem = {
  name: string;
  price: number;
  type: "アイス" | "ホット";
};

export const menuItems: DrinkItem[] = [
  // アイス（300円）
  { name: "コーヒー",          price: 300, type: "アイス" },
  { name: "オーレ",            price: 300, type: "アイス" },
  { name: "紅茶",              price: 300, type: "アイス" },
  { name: "はちみつ紅茶",      price: 300, type: "アイス" },
  { name: "抹茶オーレ",        price: 300, type: "アイス" },
  { name: "ココア",            price: 300, type: "アイス" },
  { name: "ハニーレモン",      price: 300, type: "アイス" },
  { name: "はちみつゆず",      price: 300, type: "アイス" },
  { name: "カルピス",          price: 300, type: "アイス" },
  { name: "オレンジ",          price: 300, type: "アイス" },
  { name: "マンゴー",          price: 300, type: "アイス" },
  { name: "ミックス",          price: 300, type: "アイス" },
  { name: "マンゴーラッシー",  price: 300, type: "アイス" },
  { name: "いちごオーレ",      price: 300, type: "アイス" },
  { name: "美酢ざくろ",        price: 300, type: "アイス" },
  { name: "美酢アセロラ",      price: 300, type: "アイス" },
  { name: "美酢パイン",        price: 300, type: "アイス" },
  { name: "美酢レモン",        price: 300, type: "アイス" },
  { name: "美酢キウイ",        price: 300, type: "アイス" },
  { name: "カルピス炭酸割",    price: 300, type: "アイス" },
  { name: "ハニーレモン炭酸割",price: 300, type: "アイス" },

  // ホット（300円）
  { name: "コーヒー",          price: 300, type: "ホット" },
  { name: "オーレ",            price: 300, type: "ホット" },
  { name: "紅茶",              price: 300, type: "ホット" },
  { name: "はちみつ紅茶",      price: 300, type: "ホット" },
  { name: "抹茶オーレ",        price: 300, type: "ホット" },
  { name: "ココア",            price: 300, type: "ホット" },
  { name: "ハニーレモン",      price: 300, type: "ホット" },
  { name: "はちみつゆず",      price: 300, type: "ホット" },
  { name: "こぶ茶",            price: 300, type: "ホット" },
  { name: "梅こぶ茶",          price: 300, type: "ホット" },
  { name: "カルピス",          price: 300, type: "ホット" },
  { name: "コーンスープ",      price: 300, type: "ホット" },
  { name: "クリームオニオン",  price: 300, type: "ホット" },
  { name: "ベーコンポテト",    price: 300, type: "ホット" },
  { name: "きのこ",            price: 300, type: "ホット" },
  { name: "4種のチーズ",      price: 300, type: "ホット" },

  // ホット（500円）※プレミアムだけ500円
  { name: "プレミアム",        price: 500, type: "ホット" },
];
