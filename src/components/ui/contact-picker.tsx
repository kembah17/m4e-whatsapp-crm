"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Users } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";

export interface ContactPickerProps {
  value: string;
  onValueChange: (contactId: string) => void;
  placeholder?: string;
  className?: string;
  segmentId?: string;
}

export function ContactPicker({
  value,
  onValueChange,
  placeholder = "Search customer...",
  className,
  segmentId,
}: ContactPickerProps) {
  const { accountId } = useAuth();
  const [options, setOptions] = React.useState<SearchableSelectOption[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  // Reset when segmentId changes
  React.useEffect(() => {
    setLoaded(false);
    setOptions([]);
  }, [segmentId]);

  React.useEffect(() => {
    if (!accountId || loaded) return;

    async function fetchContacts() {
      let contacts: { id: string; name: string; phone: string; email: string }[] = [];

      if (segmentId) {
        // Fetch contacts scoped to segment
        try {
          const res = await fetch(`/api/segments/${segmentId}/contacts?limit=500&fields=id,name,phone,email`);
          if (res.ok) {
            const d = await res.json();
            contacts = d.contacts ?? [];
          }
        } catch {
          // Fall through to empty
        }
      } else {
        // Fetch all contacts
        const supabase = createClient();
        const { data } = await supabase
          .from("contacts")
          .select("id, name, phone, email")
          .eq("account_id", accountId)
          .order("name", { ascending: true })
          .limit(500);
        contacts = data ?? [];
      }

      setOptions(
        contacts.map((c) => ({
          value: c.id,
          label: c.name || c.phone || c.email || "Unnamed",
          sublabel: c.phone || c.email || undefined,
          icon: <Users className="size-3.5 text-muted-foreground" />,
        })),
      );
      setLoaded(true);
    }

    fetchContacts();
  }, [accountId, segmentId, loaded]);

  return (
    <SearchableSelect
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={loaded ? placeholder : "Loading contacts..."}
      searchPlaceholder="Search by name or phone..."
      emptyMessage="No contacts found"
      className={className}
      disabled={!loaded}
    />
  );
}
