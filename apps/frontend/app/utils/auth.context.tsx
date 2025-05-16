import { createContext, useContext, useState } from 'react';

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  role: string;
  accounts?: {
    _id: string;
    accountName: string;
    accountURL?: string;
    avatarURL?: string;
  }[];
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
}) => {
  const [user, _setUser] = useState<User | null>(initialUser);
  const [isLoading, _setIsLoading] = useState(!initialUser);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
