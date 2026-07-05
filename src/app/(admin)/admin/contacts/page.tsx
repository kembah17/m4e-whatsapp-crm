import { ContactMergeTool } from "@/components/admin/contact-merge-tool"

export default function AdminContactsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contact Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage contacts across all accounts. Merge duplicates and resolve conflicts.
        </p>
      </div>
      <ContactMergeTool />
    </div>
  )
}
