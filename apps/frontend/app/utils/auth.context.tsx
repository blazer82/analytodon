import { createContext, useContext, useState } from 'react';

import { SessionUserDto } from '@analytodon/rest-client';

export type User = SessionUserDto;

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
}) => {
  const [user] = useState<User | null>(initialUser);
  const [isLoading] = useState(false); // We're not loading since we get user from the server

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
