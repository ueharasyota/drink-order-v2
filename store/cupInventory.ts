import { create } from 'zustand';

type CupInventoryState = {
  totalIce: number;
  totalHot: number;
  plannedIce: number;
  plannedHot: number;
  usedIce: number;
  usedHot: number;

  setTotalIce: (count: number) => void;
  setTotalHot: (count: number) => void;
  setPlannedIce: (count: number) => void;
  setPlannedHot: (count: number) => void;
  incrementUsedIce: (count?: number) => void;
  incrementUsedHot: (count?: number) => void;
  resetUsed: () => void;
  addStockIce: (count: number) => void;
  addStockHot: (count: number) => void;
};

export const useCupInventory = create<CupInventoryState>((set) => ({
  totalIce: 0,
  totalHot: 0,
  plannedIce: 50,
  plannedHot: 50,
  usedIce: 0,
  usedHot: 0,

  setTotalIce: (count: number) => set({ totalIce: count }),
  setTotalHot: (count: number) => set({ totalHot: count }),
  setPlannedIce: (count: number) => set({ plannedIce: count }),
  setPlannedHot: (count: number) => set({ plannedHot: count }),

  incrementUsedIce: (count = 1) =>
    set((state: CupInventoryState) => ({ usedIce: state.usedIce + count })),
  incrementUsedHot: (count = 1) =>
    set((state: CupInventoryState) => ({ usedHot: state.usedHot + count })),

  resetUsed: () => set({ usedIce: 0, usedHot: 0 }),

  addStockIce: (count: number) =>
    set((state: CupInventoryState) => ({ totalIce: state.totalIce + count })),
  addStockHot: (count: number) =>
    set((state: CupInventoryState) => ({ totalHot: state.totalHot + count })),
}));
