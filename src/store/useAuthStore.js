import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        localStorage.setItem("vtu_token", token);
        set({ user, token, isAuthenticated: true });
      },

      updateUser: (updatedUser) => {
        set((state) => ({
          user: { ...state.user, ...updatedUser },
        }));
      },

      logout: () => {
        localStorage.removeItem("vtu_token");
        localStorage.removeItem("vtu_user");
        set({ user: null, token: null, isAuthenticated: false });
      },

      getUser: () => get().user,
    }),
    {
      name: "vtu_user",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;