import React, { createContext, useContext, ReactNode } from "react";
import { useUserProfile, UserProfile } from "@/hooks/useUserProfile";
import { User } from "@supabase/supabase-js";

interface ProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ data: any; error: any }>;
  createProfile: (profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>) => Promise<{ data: any; error: any }>;
  refetch: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

interface ProfileProviderProps {
  children: ReactNode;
  user: User | null;
}

export const ProfileProvider = ({ children, user }: ProfileProviderProps) => {
  const profileHook = useUserProfile(user?.id);

  return (
    <ProfileContext.Provider value={profileHook}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
};