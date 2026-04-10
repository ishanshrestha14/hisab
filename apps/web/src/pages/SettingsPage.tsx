import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Palette, Bell, Shield, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { authClient, useSession } from "@/lib/auth-client";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});
type ProfileInput = z.infer<typeof profileSchema>;

const taxSchema = z.object({
  pan: z.string().max(20).optional(),
  vatNumber: z.string().max(20).optional(),
});
type TaxInput = z.infer<typeof taxSchema>;

const inputBase =
  "w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-colors duration-150";

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10">
        <Icon size={17} className="text-brand" />
      </div>
      <div>
        <h2 className="font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ComingSoonBadge() {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Coming soon
    </span>
  );
}

export default function SettingsPage() {
  const { data: session, refetch } = useSession();
  const { theme, toggle } = useTheme();
  const [saved, setSaved] = useState(false);
  const [taxSaved, setTaxSaved] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: session?.user.name ?? "" },
  });

  const {
    register: registerTax,
    handleSubmit: handleSubmitTax,
    reset: resetTax,
    formState: { errors: taxErrors, isSubmitting: isTaxSubmitting, isDirty: isTaxDirty },
  } = useForm<TaxInput>({ resolver: zodResolver(taxSchema) });

  // Sync name form when session loads
  useEffect(() => {
    if (session?.user.name) {
      reset({ name: session.user.name });
    }
  }, [session?.user.name, reset]);

  // Fetch PAN / VAT
  const { data: taxData } = useQuery<{ pan: string | null; vatNumber: string | null }>({
    queryKey: ["profile"],
    queryFn: () => api.get("/api/profile"),
  });

  // Sync tax form when data loads
  useEffect(() => {
    if (taxData) {
      resetTax({ pan: taxData.pan ?? "", vatNumber: taxData.vatNumber ?? "" });
    }
  }, [taxData, resetTax]);

  const updateTax = useMutation({
    mutationFn: (data: TaxInput) => api.patch("/api/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setTaxSaved(true);
      toast.success("Tax info saved");
      setTimeout(() => setTaxSaved(false), 2500);
    },
    onError: () => toast.error("Failed to save tax info"),
  });

  async function onSubmit(data: ProfileInput) {
    try {
      await authClient.updateUser({ name: data.name });
      await refetch?.();
      setSaved(true);
      toast.success("Profile updated");
      setTimeout(() => setSaved(false), 2500);
    } catch {
      toast.error("Failed to update profile");
    }
  }

  return (
    <div className="p-8 animate-in-up">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <div className="rounded-lg border border-border bg-card p-6">
          <SectionHeader
            icon={User}
            title="Profile"
            description="Update your display name and account details"
          />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Display name
                </label>
                <input
                  {...register("name")}
                  placeholder="Your name"
                  className={cn(
                    inputBase,
                    errors.name
                      ? "border-destructive focus:ring-destructive/30"
                      : "border-input focus:ring-brand/30"
                  )}
                />
                {errors.name && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle size={12} />
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  value={session?.user.email ?? ""}
                  readOnly
                  className={cn(inputBase, "border-input cursor-not-allowed opacity-60")}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {/* Auth provider badge */}
                {session?.user.image ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Google account
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                    Email account
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !isDirty}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98]",
                  saved
                    ? "bg-green-600 text-white"
                    : "bg-brand text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {saved ? (
                  <>
                    <Check size={15} />
                    Saved
                  </>
                ) : isSubmitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Appearance */}
        <div className="rounded-lg border border-border bg-card p-6">
          <SectionHeader
            icon={Palette}
            title="Appearance"
            description="Customize how Hisab looks on your device"
          />

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Theme</p>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              {/* Light option */}
              <button
                onClick={() => theme === "dark" && toggle()}
                className={cn(
                  "cursor-pointer rounded-lg border-2 p-4 text-left transition-all duration-150",
                  theme === "light"
                    ? "border-brand bg-brand/5"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <div className="mb-2 h-8 w-full rounded-md bg-white border border-slate-200 shadow-sm" />
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Light</span>
                  {theme === "light" && (
                    <Check size={14} className="text-brand" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Clean and bright</p>
              </button>

              {/* Dark option */}
              <button
                onClick={() => theme === "light" && toggle()}
                className={cn(
                  "cursor-pointer rounded-lg border-2 p-4 text-left transition-all duration-150",
                  theme === "dark"
                    ? "border-brand bg-brand/5"
                    : "border-border hover:border-muted-foreground/30"
                )}
              >
                <div className="mb-2 h-8 w-full rounded-md bg-slate-900 border border-slate-700 shadow-sm" />
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Dark</span>
                  {theme === "dark" && (
                    <Check size={14} className="text-brand" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Easy on the eyes</p>
              </button>
            </div>
          </div>
        </div>

        {/* Notifications — coming soon */}
        <div className="rounded-lg border border-border bg-card p-6 opacity-70">
          <div className="flex items-start justify-between mb-6">
            <SectionHeader
              icon={Bell}
              title="Notifications"
              description="Configure email reminders and overdue alerts"
            />
            <ComingSoonBadge />
          </div>
          <div className="space-y-3 pointer-events-none select-none">
            {[
              "Invoice sent confirmation",
              "Payment received",
              "Overdue invoice reminders",
              "Weekly summary email",
            ].map((label) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-md border border-border px-4 py-3"
              >
                <span className="text-sm text-foreground">{label}</span>
                <div className="h-5 w-9 rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </div>

        {/* Business & Tax */}
        <div className="rounded-lg border border-border bg-card p-6">
          <SectionHeader
            icon={Shield}
            title="Business & Tax"
            description="PAN and VAT numbers appear on invoices and the client portal"
          />

          <form onSubmit={handleSubmitTax((d) => updateTax.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  PAN Number
                </label>
                <input
                  {...registerTax("pan")}
                  placeholder="123456789"
                  className={cn(
                    inputBase,
                    taxErrors.pan
                      ? "border-destructive focus:ring-destructive/30"
                      : "border-input focus:ring-brand/30"
                  )}
                />
                {taxErrors.pan && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle size={12} />
                    {taxErrors.pan.message}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Nepal Permanent Account Number
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  VAT Registration
                </label>
                <input
                  {...registerTax("vatNumber")}
                  placeholder="123456789"
                  className={cn(
                    inputBase,
                    taxErrors.vatNumber
                      ? "border-destructive focus:ring-destructive/30"
                      : "border-input focus:ring-brand/30"
                  )}
                />
                {taxErrors.vatNumber && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle size={12} />
                    {taxErrors.vatNumber.message}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-muted-foreground">
                  VAT registration number (optional)
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isTaxSubmitting || !isTaxDirty}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98]",
                  taxSaved
                    ? "bg-green-600 text-white"
                    : "bg-brand text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {taxSaved ? (
                  <>
                    <Check size={15} />
                    Saved
                  </>
                ) : isTaxSubmitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
