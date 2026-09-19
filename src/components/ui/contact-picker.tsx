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
}

export function ContactPicker({
  value,
  onValueChange,
  placeholder = "Search customer...",
  className,
}: ContactPickerProps) {
  const { accountId } = useAuth();
  const [options, setOptions] = React.useState<SearchableSelectOption[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!accountId || loaded) return;
    const supabase = createClient();
    supabase
      .from("contacts")
      .select("id, name, phone, email")
      .eq("account_id", accountId)
      .order("name", { ascending: true })
      .limit(500)
      .then(({ data }) => {
        if (data) {
          setOptions(
            data.map((c) => ({
              value: c.id,
              label: c.name || c.phone || c.email || "Unnamed",
              sublabel: c.phone || c.email || undefined,
              icon: <Users className="size-3.5 text-muted-foreground" />,
            })),
          );
        }
        setLoaded(true);
      });
  }, [accountId, loaded]);

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
