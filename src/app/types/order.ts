export type Order = {
  id: number;
  createdAt: string;
  drinkType: "ice" | "hot";
  menu: string;
  price: number;
  milk: number;
  sugar: number;
  tableNo: number;
  paymentMethod: string;
  status: "pending" | "completed" | "canceled";
};
