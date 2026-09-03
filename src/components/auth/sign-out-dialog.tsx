"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";

interface SignOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  userName?: string;
}

export function SignOutDialog({
  open,
  onOpenChange,
  onConfirm,
  userName,
}: SignOutDialogProps) {
  const [signingOut, setSigningOut] = useState(false);

  const handleConfirm = async () => {
    setSigningOut(true);
    try {
      await onConfirm();
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-border bg-card">
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <LogOut className="h-6 w-6 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center text-foreground">
            Sign out of Business Growth Engine?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-muted-foreground">
            {userName ? (
              <>
                You are signed in as <span className="font-medium text-foreground">{userName}</span>.
                You will need to sign in again to access your dashboard.
              </>
            ) : (
              "You will need to sign in again to access your dashboard."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center gap-3 mt-2">
          <AlertDialogCancel
            disabled={signingOut}
            className="border-border bg-muted text-foreground hover:bg-muted/80"
          >
            Stay signed in
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={signingOut}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {signingOut ? "Signing out…" : "Yes, sign out"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
