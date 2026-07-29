// ============================================================
// Offline Operations Types
// Migration 073: Offline Payments, Hybrid Pipeline, Stage Checklists, Deal Activities
// ============================================================

import type { Contact } from "./index";
import type { Invoice } from "./business-growth";

// ============================================================
// Enums (matching DB enums)
// ============================================================

export type PaymentMethodType =
  | "bank_transfer"
  | "pos"
  | "cash"
  | "cheque"
  | "mobile_transfer"
  | "online"
  | "other";

export type OfflinePaymentStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "reversed";

export type StageType =
  | "auto_digital"
  | "manual_digital"
  | "physical_verification"
  | "external_dependent"
  | "time_gated";

export type ChecklistItemType =
  | "checkbox"
  | "document"
  | "photo"
  | "sign_off"
  | "payment";

export type ActivityType =
  | "note"
  | "call"
  | "meeting"
  | "email_sent"
  | "whatsapp_sent"
  | "stage_change"
  | "payment_received"
  | "document_uploaded"
  | "task_completed"
  | "status_change"
  | "assignment_change"
  | "other";

// ============================================================
// Display helpers
// ============================================================

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  bank_transfer: "Bank Transfer",
  pos: "POS",
  cash: "Cash",
  cheque: "Cheque",
  mobile_transfer: "Mobile Transfer",
  online: "Online",
  other: "Other",
};

export const OFFLINE_PAYMENT_STATUS_LABELS: Record<OfflinePaymentStatus, string> = {
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
  reversed: "Reversed",
};

export const STAGE_TYPE_LABELS: Record<StageType, string> = {
  auto_digital: "Auto (Digital)",
  manual_digital: "Manual (Digital)",
  physical_verification: "Physical Verification",
  external_dependent: "External Dependent",
  time_gated: "Time-Gated",
};

export const CHECKLIST_ITEM_TYPE_LABELS: Record<ChecklistItemType, string> = {
  checkbox: "Checkbox",
  document: "Document Upload",
  photo: "Photo Upload",
  sign_off: "Sign-off",
  payment: "Payment Required",
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  note: "Note",
  call: "Call",
  meeting: "Meeting",
  email_sent: "Email Sent",
  whatsapp_sent: "WhatsApp Sent",
  stage_change: "Stage Change",
  payment_received: "Payment Received",
  document_uploaded: "Document Uploaded",
  task_completed: "Task Completed",
  status_change: "Status Change",
  assignment_change: "Assignment Change",
  other: "Other",
};

// ============================================================
// Offline Payments
// ============================================================

export interface OfflinePayment {
  id: string;
  account_id: string;
  invoice_id: string | null;
  deal_id: string | null;
  contact_id: string | null;
  branch_id: string | null;
  amount: number;
  currency: string;
  payment_method: PaymentMethodType;
  reference_number: string | null;
  payment_date: string;
  status: OfflinePaymentStatus;
  proof_url: string | null;
  proof_storage_path: string | null;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  contact?: Pick<Contact, "id" | "name" | "phone" | "email"> | null;
  invoice?: Pick<Invoice, "id" | "doc_number" | "total" | "balance_due" | "status"> | null;
  verified_by_profile?: { full_name: string | null; email: string | null } | null;
  recorded_by_profile?: { full_name: string | null; email: string | null } | null;
}

export interface CreateOfflinePaymentPayload {
  invoice_id?: string | null;
  deal_id?: string | null;
  contact_id?: string | null;
  branch_id?: string | null;
  amount: number;
  currency?: string;
  payment_method: PaymentMethodType;
  reference_number?: string | null;
  payment_date?: string;
  notes?: string | null;
}

export interface VerifyOfflinePaymentPayload {
  action: "verify" | "reject";
  rejection_reason?: string;
}

// ============================================================
// Stage Checklist Templates
// ============================================================

export interface StageChecklistTemplate {
  id: string;
  stage_id: string;
  item_text: string;
  item_type: ChecklistItemType;
  is_required: boolean;
  position: number;
  description: string | null;
  created_at: string;
}

export interface CreateChecklistTemplatePayload {
  item_text: string;
  item_type?: ChecklistItemType;
  is_required?: boolean;
  position?: number;
  description?: string | null;
}

// ============================================================
// Deal Checklist Completions
// ============================================================

export interface DealChecklistCompletion {
  id: string;
  deal_id: string;
  checklist_template_id: string;
  completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  proof_url: string | null;
  proof_storage_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  template?: StageChecklistTemplate;
  completed_by_profile?: { full_name: string | null; email: string | null } | null;
}

export interface UpdateChecklistCompletionPayload {
  completed: boolean;
  proof_url?: string | null;
  proof_storage_path?: string | null;
  notes?: string | null;
}

// ============================================================
// Deal Activities
// ============================================================

export interface DealActivity {
  id: string;
  deal_id: string;
  account_id: string;
  activity_type: ActivityType;
  title: string;
  description: string | null;
  performed_by: string | null;
  contact_id: string | null;
  old_stage_id: string | null;
  new_stage_id: string | null;
  payment_id: string | null;
  attachment_url: string | null;
  attachment_storage_path: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined
  performed_by_profile?: { full_name: string | null; email: string | null } | null;
  old_stage?: { name: string; color: string } | null;
  new_stage?: { name: string; color: string } | null;
}

export interface CreateDealActivityPayload {
  activity_type: ActivityType;
  title: string;
  description?: string | null;
  contact_id?: string | null;
  attachment_url?: string | null;
  attachment_storage_path?: string | null;
  metadata?: Record<string, unknown>;
}

// ============================================================
// Views
// ============================================================

export interface DealChecklistProgress {
  deal_id: string;
  stage_id: string;
  total_items: number;
  required_items: number;
  completed_items: number;
  required_completed: number;
  completion_percent: number;
  all_required_complete: boolean | null;
}

export interface InvoicePaymentSummary {
  invoice_id: string;
  account_id: string;
  total: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  offline_payment_count: number;
  offline_verified_amount: number;
  offline_pending_amount: number;
  online_payment_count: number;
  online_payment_amount: number;
}
