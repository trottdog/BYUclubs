import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { getSafeReturnPath } from "@/lib/auth-return";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Mail, Lock, User as UserIcon } from "lucide-react";
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

  const goBack = () => {
    const dest =
      typeof window !== "undefined"
        ? getSafeReturnPath(window.location.search)
        : "/";
    setLocation(dest);
  };

  const backBtnClass = cn(
    "inline-flex items-center gap-2 border-2 border-white/45 bg-white/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-sm transition-colors hover:bg-white/20",
  );

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
  });

  const onLoginSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      setIsLoading(true);
      await login(data);
      setLocation(
        typeof window !== "undefined"
          ? getSafeReturnPath(window.location.search)
          : "/",
      );
      toast({ title: "Welcome back!", description: "Successfully logged in." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Login failed", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = async (data: z.infer<typeof registerSchema>) => {
    try {
      setIsLoading(true);
      await register(data);
      setLocation(
        typeof window !== "undefined"
          ? getSafeReturnPath(window.location.search)
          : "/",
      );
      toast({ title: "Account created!", description: "Welcome to BYUconnect." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Registration failed", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background lg:flex-row">
      {/* Mobile: back on navy only (no white top bar) */}
      <div className="flex items-center bg-primary px-4 py-3 lg:hidden">
        <button type="button" onClick={goBack} className={backBtnClass}>
          <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          Back
        </button>
      </div>

      <div className="flex w-full flex-1 flex-col lg:flex-row">
        {/* Visual side — matches app navy / editorial */}
        <div className="relative hidden flex-1 flex-col justify-center overflow-hidden bg-primary lg:flex">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(211_100%_12%)_100%)]" />
          <button type="button" onClick={goBack} className={cn(backBtnClass, "absolute left-8 top-8 z-20")}>
            <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2.5} />
            Back
          </button>
          <div className="relative z-10 mx-auto flex h-full max-w-2xl flex-col justify-center p-16 text-white">
            <div className="mb-8 flex h-20 w-20 items-center justify-center border-2 border-white/20 bg-white/10 p-2 shadow-lg">
              <img src="/images/logo.png" alt="" className="h-full w-full object-contain" />
            </div>
            <p className="connect-eyebrow !text-white/60">BYU Connect</p>
            <h1 className="mt-4 font-sans text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">
              Your campus,
              <br />
              connected.
            </h1>
            <p className="mt-6 max-w-md text-sm font-medium leading-relaxed text-white/75">
              Discover events, join clubs, and make the most of your BYU experience in one place.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="relative flex flex-1 flex-col items-center justify-center bg-background p-6 md:p-12">
          <div className="w-full max-w-md">
            <div className="mb-10 flex flex-col items-center lg:hidden">
              <div className="mb-4 flex h-16 w-16 items-center justify-center border-2 border-primary bg-white p-2">
                <img src="/images/logo.png" alt="" className="h-full w-full object-contain" />
              </div>
              <p className="connect-eyebrow">Sign in</p>
              <h1 className="mt-2 font-sans text-2xl font-bold tracking-tight text-foreground">
                BYU Connect
              </h1>
            </div>

            <div className="connect-card border-2 border-border p-8 sm:p-10">
              <h2 className="font-sans text-2xl font-bold tracking-tight text-foreground">
                {isLogin ? "Welcome back" : "Create an account"}
              </h2>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                {isLogin
                  ? "Enter your credentials to access your account."
                  : "Use your @byu.edu email to get started."}
              </p>

              {isLogin ? (
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="mt-8 space-y-4">
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                      <input
                        {...loginForm.register("email")}
                        type="email"
                        placeholder="Email address"
                        className="connect-search-input !pl-12"
                      />
                    </div>
                    {loginForm.formState.errors.email && (
                      <p className="pl-2 text-xs font-bold text-destructive">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                      <input
                        {...loginForm.register("password")}
                        type="password"
                        placeholder="Password"
                        className="connect-search-input !pl-12"
                      />
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="pl-2 text-xs font-bold text-destructive">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group connect-primary-btn mt-8 w-full justify-center py-4 disabled:opacity-70"
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                    {!isLoading && (
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="mt-8 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                        <input
                          {...registerForm.register("firstName")}
                          placeholder="First name"
                          className="connect-search-input !pl-12"
                        />
                      </div>
                      {registerForm.formState.errors.firstName && (
                        <p className="pl-2 text-xs font-bold text-destructive">
                          {registerForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <input
                        {...registerForm.register("lastName")}
                        placeholder="Last name"
                        className="connect-search-input px-4"
                      />
                      {registerForm.formState.errors.lastName && (
                        <p className="pl-2 text-xs font-bold text-destructive">
                          {registerForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                      <input
                        {...registerForm.register("email")}
                        type="email"
                        placeholder="NetID@byu.edu"
                        className="connect-search-input !pl-12"
                      />
                    </div>
                    {registerForm.formState.errors.email && (
                      <p className="pl-2 text-xs font-bold text-destructive">
                        {registerForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
                      <input
                        {...registerForm.register("password")}
                        type="password"
                        placeholder="Create a password"
                        className="connect-search-input !pl-12"
                      />
                    </div>
                    {registerForm.formState.errors.password && (
                      <p className="pl-2 text-xs font-bold text-destructive">
                        {registerForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group connect-primary-btn mt-8 w-full justify-center py-4 disabled:opacity-70"
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                    {!isLoading && (
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    )}
                  </button>
                </form>
              )}

              <div className="mt-8 border-t border-border pt-6 text-center">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
                <Link
                  href="/"
                  className="mt-4 block text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
                >
                  Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
