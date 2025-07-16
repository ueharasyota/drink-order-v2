"use client";

import React from "react";
import { Order } from "../types/order";

type OrderListProps = {
  orders: Order[];
};

export function OrderList({ orders }: OrderListProps) {
  if (orders.length === 0) {
    return <p>注文がありません。</p>;
  }

  return (
    <ul>
      {orders.map((order) => (
        <li key={order.id}>
          ID: {order.id} / メニュー: {order.menu} / 状態: {order.status}
        </li>
      ))}
    </ul>
  );
}
