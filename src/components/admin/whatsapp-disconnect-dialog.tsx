"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Unplug } from "lucide-react";

interface WhatsAppDisconnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
  phoneNumber?: string;
  onDisconnected?: () => void;
}

export function WhatsAppDisconnectDialog({
  open,
  onOpenChange,
  accountId,
  accountName,
  phoneNumber,
  onDisconnected,
}: WhatsAppDisconnectDialogProps) {
  const [reason, setReason] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/admin/whatsapp-disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, reason: reason.trim() || "No reason provided" }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to disconnect");
        return;
      }

      toast.success(
        `WhatsApp disconnected for ${accountName}` +
          (data.tokenRevoked ? " (Meta token revoked)" : " (token revocation skipped)")
      );

      onOpenChange(false);
      setReason("");
      onDisconnected?.();
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-border bg-card">
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
            <Unplug className="h-6 w-6 text-orange-500" />
          </div>
          <AlertDialogTitle className="text-center text-foreground">
            Disconnect WhatsApp?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-muted-foreground">
            This will disconnect the WhatsApp Business Account for{" "}
            <span className="font-medium text-foreground">{accountName}</span>
            {phoneNumber && (
              <>
                {" "}({phoneNumber})
              </>
            )}
            . The account will need to reconnect via Embedded Signup to resume messaging.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-2 space-y-2">
          <Label htmlFor="disconnect-reason" className="text-sm text-muted-foreground">
            Reason for disconnection (optional)
          </Label>
          <Textarea
            id="disconnect-reason"
            placeholder="e.g., Re-recording demo, client offboarding, troubleshooting..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="border-border bg-muted text-foreground placeholder:text-muted-foreground"
            rows={2}
          />
        </div>

        <AlertDialogFooter className="sm:justify-center gap-3 mt-4">
          <AlertDialogCancel
            disabled={disconnecting}
            className="border-border bg-muted text-foreground hover:bg-muted/80"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="bg-orange-600 text-white hover:bg-orange-700"
          >
            {disconnecting ? "Disconnecting…" : "Yes, disconnect"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
