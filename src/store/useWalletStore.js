import { create } from "zustand";

const useWalletStore = create((set) => ({
  balance: 0,
  loading: false,

  setBalance: (balance) => set({ balance }),

  setLoading: (loading) => set({ loading }),

  updateBalance: (newBalance) => set({ balance: newBalance }),
}));

export default useWalletStore;