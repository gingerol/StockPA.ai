import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthTokens } from '@/types';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  
  // Trial and extension actions
  requestTrialExtension: () => Promise<boolean>;
  processReferralExtension: (referralCode: string) => Promise<boolean>;
  checkTrialStatus: () => { isExpired: boolean; daysRemaining: number };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,

      login: (user: User, tokens: AuthTokens) => {
        set({
          user,
          tokens,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...updates },
          });
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      requestTrialExtension: async () => {
        const user = get().user;
        if (!user || user.requestExtensionUsed || user.totalTrialDays >= 28) {
          return false;
        }

        try {
          // TODO: API call to extend trial
          // const response = await api.requestTrialExtension(user.id);
          
          // Mock implementation for now
          const newTrialEndDate = new Date(user.trialEndDate);
          newTrialEndDate.setDate(newTrialEndDate.getDate() + 7);
          
          const updatedUser = {
            ...user,
            trialEndDate: newTrialEndDate,
            totalTrialDays: user.totalTrialDays + 7,
            requestExtensionUsed: true,
            extensionsUsed: user.extensionsUsed + 1,
          };
          
          set({ user: updatedUser });
          return true;
        } catch (error) {
          console.error('Failed to extend trial:', error);
          return false;
        }
      },

      processReferralExtension: async (referralCode: string) => {
        const user = get().user;
        if (!user || user.totalTrialDays >= 28) {
          return false;
        }

        try {
          // TODO: API call to process referral extension
          // const response = await api.processReferralExtension(user.id, referralCode);
          
          // Mock implementation for now
          const newTrialEndDate = new Date(user.trialEndDate);
          newTrialEndDate.setDate(newTrialEndDate.getDate() + 7);
          
          const updatedUser = {
            ...user,
            trialEndDate: newTrialEndDate,
            totalTrialDays: user.totalTrialDays + 7,
            referralExtensions: user.referralExtensions + 1,
            extensionsUsed: user.extensionsUsed + 1,
          };
          
          set({ user: updatedUser });
          return true;
        } catch (error) {
          console.error('Failed to process referral extension:', error);
          return false;
        }
      },

      checkTrialStatus: () => {
        const user = get().user;
        if (!user) {
          return { isExpired: true, daysRemaining: 0 };
        }

        const now = new Date();
        const trialEnd = new Date(user.trialEndDate);
        const diffTime = trialEnd.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          isExpired: daysRemaining <= 0,
          daysRemaining: Math.max(0, daysRemaining),
        };
      },
    }),
    {
      name: 'stockpa-auth',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);