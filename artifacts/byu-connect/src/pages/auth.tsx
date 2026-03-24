import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail, Lock, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").endsWith("@byu.edu", "Must be a @byu.edu email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "" }
  });

  const onLoginSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      setIsLoading(true);
      await login(data);
      setLocation("/");
      toast({ title: "Welcome back!", description: "Successfully logged in." });
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = async (data: z.infer<typeof registerSchema>) => {
    try {
      setIsLoading(true);
      await register(data);
      setLocation("/");
      toast({ title: "Account created!", description: "Welcome to BYUconnect." });
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background absolute inset-0 z-[100]">
      {/* Visual Side */}
      <div className="hidden lg:flex flex-col flex-1 relative bg-secondary overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-primary/20 backdrop-blur-[100px]" />
        </div>
        <div className="relative z-10 flex flex-col justify-center h-full p-16 text-white max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-white text-primary rounded-2xl flex items-center justify-center mb-8 shadow-xl font-extrabold text-4xl">
            Y
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            Your Campus,<br/>Connected.
          </h1>
          <p className="text-xl text-white/80 font-medium leading-relaxed">
            Discover events, join clubs, and make the most of your BYU experience in one beautiful place.
          </p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 relative bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg font-extrabold text-3xl">
              Y
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">BYUconnect</h1>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 sm:p-10 shadow-sm">
            <h2 className="text-2xl font-extrabold text-foreground mb-2">
              {isLogin ? "Welcome back" : "Create an account"}
            </h2>
            <p className="text-muted-foreground text-sm mb-8 font-medium">
              {isLogin ? "Enter your credentials to access your account." : "Use your @byu.edu email to get started."}
            </p>

            {isLogin ? (
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input 
                      {...loginForm.register("email")}
                      type="email" 
                      placeholder="Email address" 
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                    />
                  </div>
                  {loginForm.formState.errors.email && <p className="text-xs text-destructive font-bold pl-2">{loginForm.formState.errors.email.message}</p>}
                </div>
                
                <div className="space-y-1.5">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input 
                      {...loginForm.register("password")}
                      type="password" 
                      placeholder="Password" 
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                    />
                  </div>
                  {loginForm.formState.errors.password && <p className="text-xs text-destructive font-bold pl-2">{loginForm.formState.errors.password.message}</p>}
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full mt-8 py-3.5 px-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 shadow-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                  {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </button>
              </form>
            ) : (
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input 
                        {...registerForm.register("firstName")}
                        placeholder="First name" 
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                      />
                    </div>
                    {registerForm.formState.errors.firstName && <p className="text-xs text-destructive font-bold pl-2">{registerForm.formState.errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <input 
                      {...registerForm.register("lastName")}
                      placeholder="Last name" 
                      className="w-full px-4 py-3.5 rounded-xl bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                    />
                    {registerForm.formState.errors.lastName && <p className="text-xs text-destructive font-bold pl-2">{registerForm.formState.errors.lastName.message}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input 
                      {...registerForm.register("email")}
                      type="email" 
                      placeholder="NetID@byu.edu" 
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                    />
                  </div>
                  {registerForm.formState.errors.email && <p className="text-xs text-destructive font-bold pl-2">{registerForm.formState.errors.email.message}</p>}
                </div>
                
                <div className="space-y-1.5">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input 
                      {...registerForm.register("password")}
                      type="password" 
                      placeholder="Create a password" 
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium text-foreground"
                    />
                  </div>
                  {registerForm.formState.errors.password && <p className="text-xs text-destructive font-bold pl-2">{registerForm.formState.errors.password.message}</p>}
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full mt-8 py-3.5 px-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 shadow-sm transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                  {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </button>
              </form>
            )}

            <div className="mt-8 text-center pt-6 border-t border-border">
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
