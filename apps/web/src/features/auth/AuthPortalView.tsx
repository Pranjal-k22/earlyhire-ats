import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sparkles,
  BarChart2,
  Users,
  Shield,
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Activity,
  ArrowLeft,
  Info,
  HelpCircle,
  Building,
} from "lucide-react";
import { login, signup } from "../../api/authApi";
import { User } from "../../types/auth";
import { normalizeRole, CanonicalRole } from "../../types/role";

export type AuthPortalRole = "candidate" | "recruiter" | "admin";
export type AuthPortalMode = "login" | "signup";

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

interface AuthPortalViewProps {
  initialPortal?: AuthPortalRole;
  initialMode?: AuthPortalMode;
  onSuccess: (user: User) => void;
  onNavigateHome: () => void;
  onSwitchPortal?: (portal: AuthPortalRole) => void;
  isModal?: boolean;
  onCloseModal?: () => void;
}

export const AuthPortalView: React.FC<AuthPortalViewProps> = ({
  initialPortal = "candidate",
  initialMode = "login",
  onSuccess,
  onNavigateHome,
  onSwitchPortal,
  isModal = false,
  onCloseModal,
}) => {
  const [portal, setPortal] = useState<AuthPortalRole>(initialPortal);
  const [mode, setMode] = useState<AuthPortalMode>(initialMode);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [portalMismatchMessage, setPortalMismatchMessage] = useState<{
    text: string;
    targetPortal: AuthPortalRole;
    userRole: string;
  } | null>(null);
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [showSsoNotice, setShowSsoNotice] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPortal(initialPortal);
  }, [initialPortal]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    // Focus email input on load or mode switch
    const timer = setTimeout(() => {
      emailInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [portal, mode]);

  // Handle portal tab change
  const handlePortalChange = (newPortal: AuthPortalRole) => {
    setPortal(newPortal);
    setServerError(null);
    setPortalMismatchMessage(null);
    // Only candidate supports public registration
    if (newPortal !== "candidate" && mode === "signup") {
      setMode("login");
    }
    if (onSwitchPortal) {
      onSwitchPortal(newPortal);
    }
  };

  // Form Hooks
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    reset: resetLogin,
    formState: { errors: loginErrors, isSubmitting: isLoggingIn },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const {
    register: registerSignup,
    handleSubmit: handleSignupSubmit,
    reset: resetSignup,
    formState: { errors: signupErrors, isSubmitting: isSigningUp },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", role: "candidate" },
  });

  const isSubmitting = isLoggingIn || isSigningUp;

  // On Login Submit with Portal Mismatch Enforcement (Phase 3.A, 3.B, 3.C)
  const onLogin = async (data: LoginFormValues) => {
    setServerError(null);
    setPortalMismatchMessage(null);
    try {
      const res = await login({ email: data.email, password: data.password });
      const user = res.data.user;
      const canonical: CanonicalRole = user.canonicalRole || normalizeRole(user.role);

      // Verify portal compatibility
      if (portal === "candidate") {
        if (canonical === "candidate") {
          resetLogin();
          onSuccess(user);
          if (onCloseModal) onCloseModal();
          return;
        } else if (canonical === "hiring_team") {
          setPortalMismatchMessage({
            text: "This account is registered as a Hiring Team / Recruiter account. Please sign in via the Recruiter Portal.",
            targetPortal: "recruiter",
            userRole: user.role,
          });
          return;
        } else if (canonical === "platform_manager") {
          setPortalMismatchMessage({
            text: "This account is registered as a Platform Administrator account. Please sign in via the Administrator Portal.",
            targetPortal: "admin",
            userRole: user.role,
          });
          return;
        }
      } else if (portal === "recruiter") {
        if (canonical === "hiring_team" || canonical === "platform_manager") {
          resetLogin();
          onSuccess(user);
          if (onCloseModal) onCloseModal();
          return;
        } else {
          setPortalMismatchMessage({
            text: "Candidate accounts cannot access the Recruiter hiring workspace. Please sign in via the Candidate Portal.",
            targetPortal: "candidate",
            userRole: user.role,
          });
          return;
        }
      } else if (portal === "admin") {
        if (canonical === "platform_manager" || user.role === "admin") {
          resetLogin();
          onSuccess(user);
          if (onCloseModal) onCloseModal();
          return;
        } else {
          setServerError("Administrator credentials required. Access to the Platform Manager portal is restricted to authorized platform administrators.");
          return;
        }
      }

      // Default fallback
      resetLogin();
      onSuccess(user);
      if (onCloseModal) onCloseModal();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Invalid email or password");
    }
  };

  // On Candidate Signup Submit
  const onSignup = async (data: SignupFormValues) => {
    setServerError(null);
    setPortalMismatchMessage(null);
    try {
      const res = await signup({
        name: data.name,
        email: data.email,
        password: data.password,
        role: "candidate", // Strictly candidate
      });
      resetSignup();
      onSuccess(res.data.user);
      if (onCloseModal) onCloseModal();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Failed to create candidate account");
    }
  };

  // Portal Content Metadata
  const portalMeta = {
    candidate: {
      leftTitle: "EarlyAI ATS",
      leftSubtitle: "Smarter Hiring Starts Here",
      leftDesc:
        "Streamline recruitment with intelligent resume analysis, meaningful candidate insights, and a connected hiring workflow.",
      features: [
        {
          title: "Advanced Resume Insights",
          desc: "Analyze resume content and compare skills against relevant job requirements.",
          icon: BarChart2,
          bgClass: "bg-[#EEF5FF] text-[#315CFF]",
        },
        {
          title: "Connected Recruitment Workflow",
          desc: "Move applications from initial review to interviews with an organized pipeline.",
          icon: Users,
          bgClass: "bg-[#F1E9FF] text-[#8B2BFF]",
        },
        {
          title: "Actionable Candidate Insights",
          desc: "Review ATS score breakdowns and identify areas that deserve closer attention.",
          icon: Sparkles,
          bgClass: "bg-emerald-50 text-emerald-600",
        },
      ],
      cardHeading: mode === "login" ? "Welcome Back" : "Create Candidate Account",
      cardSubtitle:
        mode === "login"
          ? "Sign in to your candidate workspace"
          : "Start analyzing resumes and tracking your applications",
    },
    recruiter: {
      leftTitle: "Welcome to Your Hiring Workspace",
      leftSubtitle: "End-to-End Talent Acquisition",
      leftDesc:
        "Review resumes, manage candidates, and coordinate your recruitment pipeline in one place.",
      features: [
        {
          title: "Candidate Management",
          desc: "Track applicants and review AI match rankings across job roles.",
          icon: Users,
          bgClass: "bg-[#EEF5FF] text-[#315CFF]",
        },
        {
          title: "Application Pipeline",
          desc: "Move candidates through screening, interviews, and offer stages.",
          icon: Activity,
          bgClass: "bg-[#F1E9FF] text-[#8B2BFF]",
        },
        {
          title: "Resume & ATS Intelligence",
          desc: "Instant structured parsing and rubric-aligned scoring for hiring decisions.",
          icon: FileText,
          bgClass: "bg-emerald-50 text-emerald-600",
        },
      ],
      cardHeading: "Recruiter Sign In",
      cardSubtitle: "Access your hiring workspace",
    },
    admin: {
      leftTitle: "Platform Administration",
      leftSubtitle: "System Governance & Security",
      leftDesc:
        "Manage authorized platform operations, user access, and system health.",
      features: [
        {
          title: "Role & Permission Governance",
          desc: "Enforce strict RBAC and audit user permissions across the organization.",
          icon: Shield,
          bgClass: "bg-[#F1E9FF] text-[#8B2BFF]",
        },
        {
          title: "AI Telemetry & Token Tracking",
          desc: "Monitor AI provider allocations, response latency, and inference workloads.",
          icon: Activity,
          bgClass: "bg-[#EEF5FF] text-[#315CFF]",
        },
        {
          title: "System Integration Health",
          desc: "Live operational status of database, storage, calendar, and services.",
          icon: Lock,
          bgClass: "bg-amber-50 text-amber-600",
        },
      ],
      cardHeading: "Administrator Sign In",
      cardSubtitle: "Access authorized platform controls",
    },
  }[portal];

  return (
    <div className={`min-h-screen auth-atmosphere-bg flex flex-col justify-between ${isModal ? "p-0" : "p-4 sm:p-6 lg:p-8"}`}>
      {/* Top Header / Navigation */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between py-4 px-2">
        <button
          type="button"
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2.5 text-slate-700 hover:text-slate-950 font-medium text-sm transition-colors group focus:outline-hidden focus:ring-2 focus:ring-[#315CFF] rounded-lg px-2 py-1"
          aria-label="Return to landing page"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to EarlyAI ATS</span>
        </button>

        {isModal && onCloseModal && (
          <button
            type="button"
            onClick={onCloseModal}
            aria-label="Close dialog"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        )}
      </header>

      {/* Main Split Section (Reference Layout) */}
      <main className="max-w-7xl w-full mx-auto flex-1 flex items-center justify-center py-6 lg:py-12">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          
          {/* Left Column: Branding, Title, Subtitle, & 3 Feature Highlights (52% width on desktop) */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-center space-y-8 pr-0 lg:pr-6">
            
            {/* Brand Logo & Headline */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl gradient-badge-brand flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#172033] tracking-tight">
                    {portalMeta.leftTitle}
                  </h1>
                  <span className="sr-only">EarlyAI ATS</span>
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight leading-snug">
                {portalMeta.leftSubtitle}
              </h2>

              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl">
                {portalMeta.leftDesc}
              </p>
            </div>

            {/* 3 Feature Highlight Rows matching Screenshot */}
            <div className="space-y-5 pt-2">
              {portalMeta.features.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div key={idx} className="flex items-start gap-4 group">
                    <div className={`w-11 h-11 rounded-2xl ${feature.bgClass} flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-200`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#172033]">
                        {feature.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#667085] leading-relaxed mt-0.5">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Centered White Authentication Card (42% width on desktop) */}
          <div className="lg:col-span-6 xl:col-span-5 flex justify-center">
            <div className="w-full max-w-md bg-white rounded-[28px] auth-card-shadow border border-slate-200/90 p-7 sm:p-9 transition-all">
              
              {/* Role Portal Selector Switch (Phase 3.D) */}
              <div className="mb-6 bg-slate-100/90 p-1 rounded-2xl flex items-center" role="tablist" aria-label="Select Login Portal">
                <button
                  type="button"
                  role="tab"
                  aria-selected={portal === "candidate"}
                  onClick={() => handlePortalChange("candidate")}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all text-center ${
                    portal === "candidate"
                      ? "bg-white text-[#172033] shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Candidate
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={portal === "recruiter"}
                  onClick={() => handlePortalChange("recruiter")}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all text-center ${
                    portal === "recruiter"
                      ? "bg-white text-[#172033] shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Recruiter
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={portal === "admin"}
                  onClick={() => handlePortalChange("admin")}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all text-center ${
                    portal === "admin"
                      ? "bg-white text-[#172033] shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Admin
                </button>
              </div>

              {/* Card Header */}
              <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#172033]">
                  {portalMeta.cardHeading}
                </h2>
                <p className="text-xs sm:text-sm text-[#667085] mt-1 font-medium">
                  {portalMeta.cardSubtitle}
                </p>
              </div>

              {/* Safe Portal Mismatch Alert (Phase 3.A, 3.B, 3.C) */}
              {portalMismatchMessage && (
                <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Portal Mismatch</p>
                      <p className="mt-0.5 text-amber-800">{portalMismatchMessage.text}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePortalChange(portalMismatchMessage.targetPortal)}
                    className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition-colors"
                  >
                    Switch to {portalMismatchMessage.targetPortal.toUpperCase()} Portal
                  </button>
                </div>
              )}

              {/* General Server Error Alert */}
              {serverError && (
                <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Authentication Notice</p>
                    <p className="mt-0.5 text-rose-700">{serverError}</p>
                  </div>
                </div>
              )}

              {/* Mode Switcher Tabs for Candidate Portal (Login / Register) */}
              {portal === "candidate" && (
                <div className="flex border-b border-slate-100 mb-5">
                  <button
                    type="button"
                    data-testid="auth-tab-login"
                    onClick={() => {
                      setMode("login");
                      setServerError(null);
                      setPortalMismatchMessage(null);
                    }}
                    className={`flex-1 pb-2.5 text-xs font-bold border-b-2 transition-all ${
                      mode === "login"
                        ? "border-[#315CFF] text-[#315CFF]"
                        : "border-transparent text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    data-testid="auth-tab-signup"
                    onClick={() => {
                      setMode("signup");
                      setServerError(null);
                      setPortalMismatchMessage(null);
                    }}
                    className={`flex-1 pb-2.5 text-xs font-bold border-b-2 transition-all ${
                      mode === "signup"
                        ? "border-[#315CFF] text-[#315CFF]"
                        : "border-transparent text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    Candidate Register
                  </button>
                </div>
              )}

              {/* Login Form */}
              {mode === "login" ? (
                <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-4" noValidate>
                  {/* Email Field */}
                  <div>
                    <label
                      htmlFor="login-email"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Email <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        placeholder="Enter your email"
                        ref={emailInputRef}
                        {...registerLogin("email")}
                        className={`w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/80 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                          loginErrors.email
                            ? "border-rose-300 focus:ring-rose-500"
                            : "border-slate-200 focus:ring-[#315CFF]"
                        }`}
                      />
                    </div>
                    {loginErrors.email && (
                      <p className="text-xs text-rose-600 mt-1 font-medium">
                        {loginErrors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Password Field with Show/Hide Toggle (Phase 2.D) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
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
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        data-testid="login-password-input"
                        {...registerLogin("password")}
                        className={`w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50/80 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                          loginErrors.password
                            ? "border-rose-300 focus:ring-rose-500"
                            : "border-slate-200 focus:ring-[#315CFF]"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#315CFF]"
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

                  {/* Remember Me Option */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      id="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-[#315CFF] rounded border-slate-300 focus:ring-[#315CFF]"
                    />
                    <label htmlFor="remember-me" className="text-xs text-slate-600 font-medium select-none cursor-pointer">
                      Remember this device
                    </label>
                  </div>

                  {/* Primary Sign In Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      data-testid="login-submit-button"
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 gradient-btn-primary text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoggingIn ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <span>Sign In</span>
                      )}
                    </button>
                  </div>

                  {/* OR CONTINUE WITH Divider & Honest SSO (Phase 2.E) */}
                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-3 bg-white text-slate-400 uppercase font-semibold tracking-wider text-[11px]">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  {/* Social / SSO Buttons with Honest Policy Notice */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setShowSsoNotice(true)}
                      className="py-2.5 px-3 border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition-colors"
                      title="Enterprise Google Workspace SSO"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowSsoNotice(true)}
                      className="py-2.5 px-3 border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition-colors"
                      title="Enterprise LinkedIn SSO"
                    >
                      <svg className="w-4 h-4 fill-[#0A66C2]" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                      <span>LinkedIn</span>
                    </button>
                  </div>

                  {showSsoNotice && (
                    <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-900 animate-in fade-in duration-150">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-blue-900">Enterprise Single Sign-On</p>
                          <p className="text-[11px] text-blue-700 mt-0.5">
                            Google Workspace and LinkedIn SAML authentication are provisioned for enterprise corporate domains via platform settings. Contact your administrator to connect your identity provider.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer Account Links */}
                  <div className="pt-3 text-center">
                    {portal === "candidate" ? (
                      <p className="text-xs text-slate-500">
                        Don’t have an account?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setMode("signup");
                            setServerError(null);
                          }}
                          className="text-[#315CFF] font-bold hover:underline"
                        >
                          Sign up
                        </button>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Hiring Team & Admin accounts are provisioned via administrative invitation.{" "}
                        <button
                          type="button"
                          onClick={() => handlePortalChange("candidate")}
                          className="text-[#315CFF] font-bold hover:underline"
                        >
                          Candidate signup →
                        </button>
                      </p>
                    )}
                  </div>
                </form>
              ) : (
                /* Candidate Signup Form (Phase 4) */
                <form onSubmit={handleSignupSubmit(onSignup)} className="space-y-4" noValidate>
                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="signup-name"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="signup-name"
                        type="text"
                        autoComplete="name"
                        placeholder="Jane Doe"
                        {...registerSignup("name")}
                        className={`w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/80 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all ${
                          signupErrors.name
                            ? "border-rose-300 focus:ring-rose-500"
                            : "border-slate-200 focus:ring-[#315CFF]"
                        }`}
                      />
                    </div>
                    {signupErrors.name && (
                      <p className="text-xs text-rose-600 mt-1 font-medium">
                        {signupErrors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="signup-email"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        placeholder="candidate@example.com"
                        {...registerSignup("email")}
                        className={`w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/80 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all ${
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

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="signup-password"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="At least 8 chars with upper, lower, & digit"
                        data-testid="signup-password-input"
                        {...registerSignup("password")}
                        className={`w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50/80 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition-all ${
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
                      Must contain uppercase, lowercase, and numeric characters.
                    </p>
                  </div>

                  {/* Public Registration Notice (Phase 4) */}
                  <div className="p-3 bg-purple-50/70 border border-purple-200/60 rounded-xl text-xs text-purple-900 flex items-start gap-2.5">
                    <input type="hidden" {...registerSignup("role")} value="candidate" />
                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-purple-900">Candidate Role Provisioned</p>
                      <p className="text-[11px] text-purple-700/90 mt-0.5 leading-relaxed">
                        Public registration creates candidate accounts for profile self-service, resume uploads, and AI ATS analysis.
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      data-testid="signup-submit-button"
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 gradient-btn-primary text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSigningUp ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <span>Create Account</span>
                      )}
                    </button>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 text-center">
                    <p className="text-xs text-slate-500">
                      Already registered?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("login");
                          setServerError(null);
                        }}
                        className="text-[#315CFF] font-bold hover:underline"
                      >
                        Sign in here
                      </button>
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
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

      {/* Minimal Footer */}
      <footer className="max-w-7xl w-full mx-auto py-4 px-2 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} EarlyAI ATS. All rights reserved. Role-Based Access Control enforced by server identity.
      </footer>
    </div>
  );
};
