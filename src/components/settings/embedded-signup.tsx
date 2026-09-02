"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  RefreshCw,
  Shield,
  Smartphone,
  Wifi,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// ============================================================
// Facebook SDK type declarations
// ============================================================

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (params: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FBLoginResponse) => void,
        options: FBLoginOptions,
      ) => void;
    };
  }
}

interface FBLoginResponse {
  authResponse?: {
    code?: string;
    accessToken?: string;
    userID?: string;
    expiresIn?: number;
    signedRequest?: string;
    graphDomain?: string;
    data_access_expiration_time?: number;
  } | null;
  status?: string;
}

/**
 * Facebook SDK login options.
 *
 * Two valid approaches per Meta documentation:
 * 1. config_id - Pre-configured Embedded Signup Configuration (preferred for production)
 * 2. scope - Standard OAuth permission request (valid alternative)
 *
 * Both are production-grade. config_id additionally controls the signup UI
 * (which fields to show, pre-selected options, etc.).
 */
interface FBLoginOptions {
  config_id?: string;
  scope?: string;
  response_type?: string;
  override_default_response_type?: boolean;
  extras?: {
    setup?: Record<string, unknown>;
    featureType?: string;
    sessionInfoVersion?: string;
  };
}

// ============================================================
// Types
// ============================================================

type SignupStep = "idle" | "connecting" | "verifying" | "registering" | "connected" | "error";

interface ConnectionDetails {
  businessName: string;
  phoneNumber: string;
  phoneNumberId: string;
  verifiedName?: string;
  registered: boolean;
  registrationError?: string;
}

interface EmbeddedSignupStatus {
  has_session: boolean;
  session?: {
    id: string;
    status: string;
    waba_id?: string;
    phone_number_id?: string;
    meta_business_id?: string;
    error_message?: string;
    completed_at?: string;
  };
  config?: {
    setup_method: string;
    business_name?: string;
    display_phone_number?: string;
    embedded_signup_completed_at?: string;
    phone_verified?: boolean;
  };
}

interface ConfigStatus {
  ready: boolean;
  has_app_id: boolean;
  has_app_secret: boolean;
  has_config_id: boolean;
}

// ============================================================
// Steps configuration
// ============================================================

const STEPS: { key: SignupStep; label: string; icon: typeof Wifi }[] = [
  { key: "connecting", label: "Connecting", icon: Wifi },
  { key: "verifying", label: "Verifying", icon: Shield },
  { key: "registering", label: "Registering", icon: Smartphone },
  { key: "connected", label: "Connected!", icon: CheckCircle2 },
];

const STEP_ORDER: SignupStep[] = ["connecting", "verifying", "registering", "connected"];

/**
 * Required OAuth permissions for WhatsApp Business API.
 * These are the approved permissions from Meta App Review.
 */
const REQUIRED_PERMISSIONS = [
  "business_management",
  "whatsapp_business_management",
  "whatsapp_business_messaging",
].join(",");

// ============================================================
// Component
// ============================================================

export function EmbeddedSignup() {
  const [step, setStep] = useState<SignupStep>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [connection, setConnection] = useState<ConnectionDetails | null>(null);
  const [existingConnection, setExistingConnection] = useState<EmbeddedSignupStatus | null>(null);
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const sdkLoadedRef = useRef(false);
  const sdkLoadingRef = useRef(false);

  // ----------------------------------------------------------
  // Check server configuration + existing connection on mount
  // ----------------------------------------------------------
  const fetchStatus = useCallback(async () => {
    try {
      // Pre-flight: check if server is properly configured
      const configRes = await fetch("/api/whatsapp/embedded-signup/start");
      if (configRes.ok) {
        const configData = (await configRes.json()) as ConfigStatus;
        setConfigStatus(configData);
      }

      // Check existing connection
      const res = await fetch("/api/whatsapp/embedded-signup/status");
      if (res.ok) {
        const data = (await res.json()) as EmbeddedSignupStatus;
        setExistingConnection(data);
        if (
          data.config?.setup_method === "embedded_signup" &&
          data.config?.business_name
        ) {
          setStep("connected");
          setConnection({
            businessName: data.config.business_name,
            phoneNumber: data.config.display_phone_number ?? "",
            phoneNumberId: data.session?.phone_number_id ?? "",
            registered: data.config.phone_verified ?? false,
          });
        }
      }
    } catch {
      // Silently fail - user can still initiate signup
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // ----------------------------------------------------------
  // Load Facebook SDK
  // ----------------------------------------------------------
  const loadFacebookSDK = useCallback((appId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.FB && sdkLoadedRef.current) {
        resolve();
        return;
      }

      if (sdkLoadingRef.current) {
        const check = setInterval(() => {
          if (window.FB) {
            clearInterval(check);
            resolve();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(check);
          reject(new Error("Facebook SDK load timeout"));
        }, 15000);
        return;
      }

      sdkLoadingRef.current = true;

      window.fbAsyncInit = function () {
        window.FB!.init({
          appId,
          cookie: true,
          xfbml: true,
          version: "v21.0",
        });
        sdkLoadedRef.current = true;
        resolve();
      };

      const script = document.createElement("script");
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.onerror = () => {
        sdkLoadingRef.current = false;
        reject(new Error("Failed to load Facebook SDK. Check your internet connection or browser ad-blocker."));
      };
      document.body.appendChild(script);

      setTimeout(() => {
        if (!sdkLoadedRef.current) {
          sdkLoadingRef.current = false;
          reject(new Error("Facebook SDK load timeout. Check your internet connection or browser ad-blocker."));
        }
      }, 15000);
    });
  }, []);

  // ----------------------------------------------------------
  // Main signup flow
  // ----------------------------------------------------------
  const handleStartSignup = useCallback(async () => {
    setStep("connecting");
    setErrorMessage("");

    try {
      // Step 1: Get state token and app config from server
      const startRes = await fetch("/api/whatsapp/embedded-signup/start", {
        method: "POST",
      });
      const startData = await startRes.json();

      if (!startRes.ok) {
        throw new Error(startData.error || "Failed to start signup session");
      }

      const { state_token, app_id, config_id } = startData;

      // Step 2: Load Facebook SDK
      await loadFacebookSDK(app_id);

      // Step 3: Launch FB.login popup
      setStep("verifying");

      const fbResponse = await new Promise<FBLoginResponse>(
        (resolve, reject) => {
          if (!window.FB) {
            reject(new Error("Facebook SDK not available"));
            return;
          }

          const loginOptions: FBLoginOptions = {
            response_type: "code",
            override_default_response_type: true,
            extras: {
              setup: {},
              featureType: "",
              sessionInfoVersion: "2",
            },
          };

          if (config_id) {
            // Method A: Use pre-configured Embedded Signup Configuration
            // This controls the signup UI and pre-selects options
            loginOptions.config_id = config_id;
          } else {
            // Method B: Standard OAuth scope-based permission request
            // Both methods are documented and production-valid per Meta docs
            loginOptions.scope = REQUIRED_PERMISSIONS;
          }

          window.FB.login((response: FBLoginResponse) => {
            resolve(response);
          }, loginOptions);

          // Timeout for popup - user might close it
          setTimeout(() => {
            reject(new Error("Signup popup timed out. Please try again."));
          }, 300000); // 5 minutes
        },
      );

      // Check if user cancelled
      if (!fbResponse.authResponse?.code) {
        setStep("idle");
        toast.error("Signup was cancelled or no authorization was granted.");
        return;
      }

      const code = fbResponse.authResponse.code;

      // Extract WABA ID and Phone Number ID from the session info
      const authResponse = fbResponse.authResponse as Record<string, unknown>;

      let wabaId: string | undefined;
      let phoneNumberId: string | undefined;

      // Check direct properties
      if (authResponse.waba_id) {
        wabaId = String(authResponse.waba_id);
      }
      if (authResponse.phone_number_id) {
        phoneNumberId = String(authResponse.phone_number_id);
      }

      // Check nested session_info (Embedded Signup v2 format)
      const sessionInfo = authResponse.sessionInfo as Record<string, unknown> | undefined;
      if (sessionInfo) {
        if (!wabaId && sessionInfo.waba_id) {
          wabaId = String(sessionInfo.waba_id);
        }
        if (!phoneNumberId && sessionInfo.phone_number_id) {
          phoneNumberId = String(sessionInfo.phone_number_id);
        }
      }

      if (!wabaId || !phoneNumberId) {
        throw new Error(
          "Could not extract WhatsApp Business Account ID or Phone Number ID from the signup response. " +
          "This can happen if the Meta app is still in Development mode. " +
          "Please ensure the app has been approved by Meta, or try Manual Setup.",
        );
      }

      // Step 4: Send to callback endpoint for server-side completion
      setStep("registering");

      const callbackRes = await fetch(
        "/api/whatsapp/embedded-signup/callback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            state_token,
            // Only include WABA/phone if available from popup response
            // Server will auto-discover them if missing (scope-based OAuth)
            ...(wabaId && { waba_id: wabaId }),
            ...(phoneNumberId && { phone_number_id: phoneNumberId }),
          }),
        },
      );

      const callbackData = await callbackRes.json();

      if (!callbackRes.ok) {
        throw new Error(callbackData.error || "Failed to complete signup");
      }

      // Success!
      setStep("connected");
      setConnection({
        businessName: callbackData.business_name,
        phoneNumber: callbackData.phone_number,
        phoneNumberId: callbackData.phone_number_id,
        verifiedName: callbackData.verified_name,
        registered: callbackData.registered,
        registrationError: callbackData.registration_error,
      });

      if (callbackData.registered) {
        toast.success(
          `Connected! ${callbackData.business_name} is now live on WhatsApp.`,
        );
      } else {
        toast.success(
          "Connected! Credentials saved. Registration may need a PIN - see Manual Setup.",
          { duration: 8000 },
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setStep("error");
      setErrorMessage(message);
      toast.error(message);
    }
  }, [loadFacebookSDK]);

  // ----------------------------------------------------------
  // Reconnect handler
  // ----------------------------------------------------------
  const handleReconnect = useCallback(() => {
    setStep("idle");
    setConnection(null);
    setErrorMessage("");
  }, []);

  // ----------------------------------------------------------
  // Render helpers
  // ----------------------------------------------------------
  const currentStepIndex = STEP_ORDER.indexOf(step);
  const isConfigReady = configStatus?.ready ?? false;
  const isMissingSecret = configStatus && !configStatus.has_app_secret;

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration Warning */}
      {configStatus && !isConfigReady && (
        <Alert className="bg-amber-950/30 border-amber-700/50">
          <AlertTriangle className="size-4 text-amber-400" />
          <AlertTitle className="text-amber-200">
            Server Configuration Incomplete
          </AlertTitle>
          <AlertDescription className="text-amber-100/80 text-sm space-y-2">
            {!configStatus.has_app_id && (
              <p className="flex items-start gap-2">
                <XCircle className="size-4 shrink-0 mt-0.5 text-red-400" />
                <span><strong>META_APP_ID</strong> is not set. Add it to your Vercel environment variables.</span>
              </p>
            )}
            {isMissingSecret && (
              <p className="flex items-start gap-2">
                <XCircle className="size-4 shrink-0 mt-0.5 text-red-400" />
                <span>
                  <strong>META_APP_SECRET</strong> is not set. Get it from{" "}
                  <span className="font-mono text-amber-300">Meta App Dashboard &rarr; Settings &rarr; Basic &rarr; App Secret</span>,{" "}
                  then add it as a Vercel environment variable and redeploy.
                </span>
              </p>
            )}
            {!configStatus.has_config_id && configStatus.has_app_id && configStatus.has_app_secret && (
              <p className="flex items-start gap-2">
                <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-blue-400" />
                <span><strong>META_EMBEDDED_SIGNUP_CONFIG_ID</strong> is not set (optional). The system will use standard OAuth permissions instead. This is fine for production.</span>
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Config OK info when ready but no config_id */}
      {configStatus && isConfigReady && !configStatus.has_config_id && (
        <Alert className="bg-blue-950/30 border-blue-700/50">
          <Shield className="size-4 text-blue-400" />
          <AlertTitle className="text-blue-200">
            Using Standard OAuth Mode
          </AlertTitle>
          <AlertDescription className="text-blue-100/80 text-sm">
            No Embedded Signup Configuration ID is set. The system will request permissions
            via standard OAuth scope. This is a fully supported production method per Meta documentation.
          </AlertDescription>
        </Alert>
      )}

      {/* Banner */}
      <Alert className="bg-emerald-950/30 border-emerald-700/50">
        <MessageSquare className="size-4 text-emerald-400" />
        <AlertTitle className="text-emerald-200">
          Quick Setup &mdash; Connect in 60 seconds
        </AlertTitle>
        <AlertDescription className="text-emerald-100/80 text-sm">
          Our guided setup handles everything automatically. Just sign in with
          your Meta Business account and select your WhatsApp number.
        </AlertDescription>
      </Alert>

      {/* Progress Steps */}
      {step !== "idle" && step !== "error" && (
        <div className="flex items-center justify-between gap-2 px-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = s.key === step;
            const isComplete = currentStepIndex > i;

            return (
              <div key={s.key} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                      : isComplete
                        ? "bg-emerald-950/40 text-emerald-400"
                        : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {isActive && s.key !== "connected" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : isComplete ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <Icon className="size-3.5" />
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`hidden h-px flex-1 sm:block ${
                      isComplete
                        ? "bg-emerald-700/50"
                        : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Main Content - Idle State */}
      {step === "idle" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">
              Connect with WhatsApp Business
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in with your Meta Business account to automatically configure
              your WhatsApp Business API. No manual token setup required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <h4 className="text-sm font-medium text-foreground">
                What happens when you click Connect:
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    1
                  </span>
                  A Meta popup opens for you to sign in and select your business
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    2
                  </span>
                  Choose or create a WhatsApp Business Account and phone number
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    3
                  </span>
                  We automatically configure your API access and webhook
                </li>
              </ul>
            </div>

            <Button
              onClick={handleStartSignup}
              disabled={!isConfigReady}
              size="lg"
              className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold text-base h-12 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MessageSquare className="size-5" />
              {!isConfigReady ? "Configuration Required (see above)" : "Connect with WhatsApp"}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              You need a Meta Business account with admin access.
              If you don&apos;t have one, Meta will guide you through creating it.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Connected State */}
      {step === "connected" && connection && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-400" />
              <CardTitle className="text-emerald-200">
                WhatsApp Connected
              </CardTitle>
            </div>
            <CardDescription className="text-muted-foreground">
              Your WhatsApp Business API is configured and ready to use.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Business Name</p>
                  <p className="text-sm font-medium text-foreground">
                    {connection.businessName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone Number</p>
                  <p className="text-sm font-medium text-foreground">
                    {connection.phoneNumber}
                  </p>
                </div>
                {connection.verifiedName && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Verified Name
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {connection.verifiedName}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Registration</p>
                  <p
                    className={`text-sm font-medium ${
                      connection.registered
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  >
                    {connection.registered
                      ? "Registered for events"
                      : "Pending - add PIN in Manual Setup"}
                  </p>
                </div>
              </div>

              {connection.registrationError && (
                <Alert className="bg-amber-950/30 border-amber-700/50">
                  <AlertDescription className="text-amber-200 text-xs">
                    Registration note: {connection.registrationError}
                  </AlertDescription>
                </Alert>
              )}

              {existingConnection?.config?.embedded_signup_completed_at && (
                <p className="text-xs text-muted-foreground">
                  Connected on{" "}
                  {new Date(
                    existingConnection.config.embedded_signup_completed_at,
                  ).toLocaleString()}
                </p>
              )}
            </div>

            <Button
              variant="outline"
              onClick={handleReconnect}
              className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <RefreshCw className="size-4" />
              Reconnect
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {step === "error" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="size-5 text-red-400" />
              <CardTitle className="text-red-200">Connection Failed</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-red-950/30 border-red-700/50">
              <AlertDescription className="text-red-200 text-sm">
                {errorMessage}
              </AlertDescription>
            </Alert>

            {/* Contextual troubleshooting */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <h4 className="text-sm font-medium text-foreground">Troubleshooting</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {errorMessage.includes("SDK") && (
                  <li>&bull; Check if an ad-blocker is blocking Facebook scripts</li>
                )}
                {errorMessage.includes("permission") && (
                  <>
                    <li>&bull; Ensure you have Admin access to the Meta Business account</li>
                    <li>&bull; If the app is in Development mode, only app Admins/Developers/Testers can use it</li>
                  </>
                )}
                {errorMessage.includes("APP_SECRET") && (
                  <li>&bull; The server administrator needs to add META_APP_SECRET to the environment variables</li>
                )}
                {errorMessage.includes("session") && (
                  <li>&bull; Your session may have expired. Click &ldquo;Try Again&rdquo; to start a fresh session</li>
                )}
                {errorMessage.includes("discover") && (
                  <>
                    <li>&bull; Ensure your Meta Business account has a WhatsApp Business Account (WABA) with at least one phone number</li>
                    <li>&bull; You can create a WABA at <strong>business.facebook.com</strong> &rarr; WhatsApp Accounts</li>
                  </>
                )}
                <li>&bull; If this keeps happening, try the <strong>Manual Setup</strong> tab to enter your credentials directly</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleStartSignup}
                disabled={!isConfigReady}
                className="bg-[#25D366] hover:bg-[#128C7E] text-white"
              >
                <RefreshCw className="size-4" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={handleReconnect}
                className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* In-progress states (connecting, verifying, registering) */}
      {(step === "connecting" || step === "verifying" || step === "registering") && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="size-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-foreground font-medium">
                {step === "connecting" && "Starting secure connection..."}
                {step === "verifying" && "Complete the signup in the Meta popup..."}
                {step === "registering" && "Setting up your WhatsApp connection..."}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {step === "connecting" && "Preparing your signup session"}
                {step === "verifying" &&
                  "Sign in and select your WhatsApp Business Account"}
                {step === "registering" &&
                  "Discovering your business account, exchanging tokens, and configuring webhooks"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
