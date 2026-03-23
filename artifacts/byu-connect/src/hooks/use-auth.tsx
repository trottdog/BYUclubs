import { createContext, useContext, ReactNode } from "react";
import { useGetMe, useLogin, useRegister, useLogout, User } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: ReturnType<typeof useLogin>;
  register: ReturnType<typeof useRegister>;
  logout: ReturnType<typeof useLogout>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: user, isLoading, refetch } = useGetMe({
    query: {
      retry: false,
      staleTime: Infinity,
    },
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: () => {
        refetch();
        setLocation("/");
        toast({ title: "Welcome back!", description: "Successfully logged in." });
      },
      onError: (error) => {
        toast({ 
          title: "Login failed", 
          description: error.error || "Please check your credentials.", 
          variant: "destructive" 
        });
      }
    }
  });

  const registerMutation = useRegister({
    mutation: {
      onSuccess: () => {
        refetch();
        setLocation("/");
        toast({ title: "Account created!", description: "Welcome to BYUconnect." });
      },
      onError: (error) => {
        toast({ 
          title: "Registration failed", 
          description: error.error || "An error occurred.", 
          variant: "destructive" 
        });
      }
    }
  });

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        refetch();
        setLocation("/auth");
        toast({ title: "Logged out", description: "You have been safely logged out." });
      }
    }
  });

  return (
    <AuthContext.Provider value={{
      user: user || null,
      isLoading,
      login: loginMutation,
      register: registerMutation,
      logout: logoutMutation,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
