import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X,
  AlertCircle,
  LogIn,
  UserPlus,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  Sparkles,
  HelpCircle,
  Briefcase,
} from "lucide-react";
import { login, signup } from "../../api/authApi";
import { User } from "../../types/auth";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name cannot exceed 80 characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain an uppercase letter, lowercase letter, and number"
  ),
  role: z.literal("candidate"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialMode?: "login" | "signup";
  initialPortal?: "candidate" | "recruiter" | "admin";
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = "login",
  initialPortal = "candidate",
}) => {
  const [portalRole, setPortalRole] = useState<"candidate" | "recruiter">(
    initialPortal === "recruiter" ? "recruiter" : "candidate"
  );
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [portalMismatchMessage, setPortalMismatchMessage] = useState<{
    text: string;
    targetPortal: "candidate" | "recruiter" | "admin";
  } | null>(null);
  const [showSsoNotice, setShowSsoNotice] = useState<boolean>(false);
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLInputElement | null>(null);

  // Sync mode when initialMode changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setPortalRole(initialPortal === "recruiter" ? "recruiter" : "candidate");
      setServerError(null);
      setPortalMismatchMessage(null);
    }
  }, [isOpen, initialMode, initialPortal]);

  // Focus trap / initial focus
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        initialFocusRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mode]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Login Form
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    reset: resetLogin,
    formState: { errors: loginErrors, isSubmitting: isLoggingIn },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Signup Form
  const {
    register: registerSignup,
    handleSubmit: handleSignupSubmit,
    reset: resetSignup,
    formState: { errors: signupErrors, isSubmitting: isSigningUp },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", role: "candidate" },
  });

  const onLogin = async (data: LoginFormValues) => {
    setServerError(null);
    setPortalMismatchMessage(null);
    try {
      const res = await login({ email: data.email, password: data.password });
      const user = res.data.user;

      resetLogin();
      onSuccess(user);
      onClose();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Invalid email or password");
    }
  };

  const onSignup = async (data: SignupFormValues) => {
    setServerError(null);
    setPortalMismatchMessage(null);
    try {
      const res = await signup({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      });
      resetSignup();
      onSuccess(res.data.user);
      onClose();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Failed to create account");
    }
  };

  if (!isOpen) return null;

  const isSubmitting = isLoggingIn || isSigningUp;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-white rounded-3xl auth-card-shadow border border-slate-200/90 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl gradient-badge-brand flex items-center justify-center text-white font-bold shadow-md shadow-purple-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 id="auth-modal-title" className="text-base font-bold text-slate-900">
                  {mode === "login" ? "Sign In to EarlyAI ATS" : "Create Candidate Account"}
                </h2>
                <p className="text-xs text-slate-500">
                  {mode === "login"
                    ? portalRole === "candidate"
                      ? "Welcome back! Enter credentials to access your Candidate portal."
                      : "Welcome back! Enter credentials to access ATS recruiter workspace."
                    : "Register to manage profile, upload resumes, and view AI ATS scores."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Candidate vs Recruiter Role Switcher */}
          <div
            className="mt-4 bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/60"
            role="tablist"
            aria-label="Select Login Portal Role"
          >
            <button
              type="button"
              role="tab"
              data-testid="auth-role-candidate"
              aria-selected={portalRole === "candidate"}
              onClick={() => {
                setPortalRole("candidate");
                setServerError(null);
                setPortalMismatchMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                portalRole === "candidate"
                  ? "bg-white text-[#315CFF] shadow-xs border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Candidate</span>
            </button>
            <button
              type="button"
              role="tab"
              data-testid="auth-role-recruiter"
              aria-selected={portalRole === "recruiter"}
              onClick={() => {
                setPortalRole("recruiter");
                setServerError(null);
                setPortalMismatchMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                portalRole === "recruiter"
                  ? "bg-white text-purple-700 shadow-xs border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Recruiter</span>
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-100/90 p-1 rounded-xl mt-2">
            <button
              type="button"
              data-testid="auth-tab-login"
              onClick={() => {
                setMode("login");
                setServerError(null);
                setPortalMismatchMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === "login"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              data-testid="auth-tab-signup"
              onClick={() => {
                setMode("signup");
                setServerError(null);
                setPortalMismatchMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === "signup"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>
        </div>

        {/* Portal Mismatch Alert */}
        {portalMismatchMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Portal Mismatch</p>
                <p className="mt-0.5 text-amber-800">{portalMismatchMessage.text}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPortalMismatchMessage(null);
              }}
              className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Server Error Alert */}
        {serverError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200/90 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Authentication Error</p>
              <p className="mt-0.5 text-rose-700">{serverError}</p>
            </div>
          </div>
        )}

        {/* Modal Form Body */}
        <div className="p-6">
          {mode === "login" ? (
            <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {portalRole === "recruiter" ? "Work Email" : "Candidate / Work Email"}{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {(() => {
                    const reg = registerLogin("email");
                    return (
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        placeholder={
                          portalRole === "recruiter"
                            ? "recruiter@company.com"
                            : "candidate@example.com"
                        }
                        {...reg}
                        ref={(el) => {
                          reg.ref(el);
                          initialFocusRef.current = el;
                        }}
                        className={`w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                          loginErrors.email
                            ? "border-rose-300 focus:ring-rose-500"
                            : "border-slate-200 focus:ring-[#315CFF]"
                        }`}
                      />
                    );
                  })()}
                </div>
                {loginErrors.email && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">
                    {loginErrors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs text-[#315CFF] hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...registerLogin("password")}
                    className={`w-full pl-9 pr-10 py-2 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                      loginErrors.password
                        ? "border-rose-300 focus:ring-rose-500"
                        : "border-slate-200 focus:ring-[#315CFF]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                    aria-label="Toggle visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginErrors.password && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">
                    {loginErrors.password.message}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  data-testid="login-submit-button"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 gradient-btn-primary text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Sign In</span>
                    </>
                  )}
                </button>
              </div>

              {/* Honest SSO section */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowSsoNotice(!showSsoNotice)}
                  className="w-full py-2 px-3 border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Enterprise SSO (Google / LinkedIn SAML)</span>
                </button>

                {showSsoNotice && (
                  <div className="mt-2 p-2.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 animate-in fade-in duration-150">
                    <p className="font-semibold text-blue-900">Corporate Single Sign-On</p>
                    <p className="text-blue-700 mt-0.5">
                      SAML and OAuth identity provider connections are managed securely through platform administration. Contact your IT administrator to connect your domain.
                    </p>
                  </div>
                )}
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit(onSignup)} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="signup-name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {(() => {
                    const reg = registerSignup("name");
                    return (
                      <input
                        id="signup-name"
                        type="text"
                        autoComplete="name"
                        placeholder="Jane Doe"
                        {...reg}
                        ref={(el) => {
                          reg.ref(el);
                          initialFocusRef.current = el;
                        }}
                        className={`w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                          signupErrors.name
                            ? "border-rose-300 focus:ring-rose-500"
                            : "border-slate-200 focus:ring-[#315CFF]"
                        }`}
                      />
                    );
                  })()}
                </div>
                {signupErrors.name && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">
                    {signupErrors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Work Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="recruiter@company.com"
                    {...registerSignup("email")}
                    className={`w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                      signupErrors.email
                        ? "border-rose-300 focus:ring-rose-500"
                        : "border-slate-200 focus:ring-[#315CFF]"
                    }`}
                  />
                </div>
                {signupErrors.email && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">
                    {signupErrors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="signup-password"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 8 chars with uppercase, lowercase & number"
                    {...registerSignup("password")}
                    className={`w-full pl-9 pr-10 py-2 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                      signupErrors.password
                        ? "border-rose-300 focus:ring-rose-500"
                        : "border-slate-200 focus:ring-[#315CFF]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                    aria-label="Toggle visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {signupErrors.password && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">
                    {signupErrors.password.message}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  Must be at least 8 characters with upper, lower, and digit.
                </p>
              </div>

              <div className="p-3 bg-purple-50/70 border border-purple-200/60 rounded-xl text-xs text-purple-900 flex items-start gap-2.5">
                <input type="hidden" {...registerSignup("role")} value="candidate" />
                <div className="w-5 h-5 rounded-md gradient-btn-primary text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                  ✓
                </div>
                <div>
                  <p className="font-semibold text-purple-900">Candidate Portal Account</p>
                  <p className="text-[11px] text-purple-700/90 mt-0.5 leading-relaxed">
                    Public registration creates candidate accounts for profile self-service and AI ATS analysis. Hiring-team and platform-manager accounts are provisioned by administrators.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  data-testid="signup-submit-button"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 gradient-btn-primary text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSigningUp ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              {mode === "login" ? (
                <>
                  {portalRole === "candidate" ? (
                    <>
                      Need a candidate account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("signup");
                          setServerError(null);
                        }}
                        className="text-[#315CFF] hover:text-purple-700 font-semibold underline underline-offset-2"
                      >
                        Register now
                      </button>
                    </>
                  ) : (
                    <>
                      Need an ATS recruiter account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setPortalRole("candidate");
                          setMode("signup");
                          setServerError(null);
                        }}
                        className="text-[#315CFF] hover:text-purple-700 font-semibold underline underline-offset-2"
                      >
                        Register as candidate
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  Already registered?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setServerError(null);
                    }}
                    className="text-[#315CFF] hover:text-purple-700 font-semibold underline underline-offset-2"
                  >
                    Sign in here
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-[#315CFF]" />
                <span>Password Recovery</span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              EarlyAI ATS enforces verified email dispatch for secure password recovery. In local test environments, please contact your workspace administrator to reset your credentials.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
