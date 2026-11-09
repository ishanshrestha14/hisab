import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/utils";
import "./pdf-fonts"; // registers Inter


export interface StatementInvoice {
  id: string;
  number: string;
  status: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  total: number;
  tdsPercent: number;
  tdsAmount: number;
  netReceivable: number;
  /** Payments recorded against the invoice */
  amountPaid: number;
  /** Net receivable once PAID, payments so far while open, 0 for drafts */
  collected: number;
  /** Net receivable minus payments while open, otherwise 0 */
  balance: number;
}

export interface StatementPDFProps {
  client: {
    name: string;
    email: string;
    company?: string | null;
    country?: string | null;
  };
  freelancer: {
    name: string;
    email: string;
  };
  invoices: StatementInvoice[];
  summary: {
    totalInvoiced: number;
    totalPaid: number;
    totalOutstanding: number;
    invoiceCount: number;
    paidCount: number;
  };
  generatedAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  OVERDUE: "Overdue",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const s = StyleSheet.create({
  page:          { fontFamily: "Inter", fontSize: 9, color: "#111827", padding: 44, backgroundColor: "#ffffff" },
  // Header
  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  titleBlock:    { flex: 1 },
  title:         { fontSize: 18, fontWeight: 600, color: "#111827" },
  subtitle:      { fontSize: 9, color: "#6b7280", marginTop: 3 },
  metaRight:     { alignItems: "flex-end", gap: 2 },
  metaLine:      { fontSize: 8, color: "#6b7280" },
  metaValue:     { fontSize: 8, fontWeight: 600, color: "#374151" },
  // From/To
  parties:       { flexDirection: "row", gap: 0, marginBottom: 24 },
  partyBox:      { flex: 1, paddingRight: 12 },
  partyLabel:    { fontSize: 7, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 },
  partyName:     { fontSize: 10, fontWeight: 600, color: "#111827", marginBottom: 2 },
  partyDetail:   { fontSize: 8, color: "#6b7280", marginBottom: 1 },
  divider:       { borderBottomWidth: 1.5, borderBottomColor: "#111827", marginBottom: 14 },
  // Table
  tableHeader:   { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 6, backgroundColor: "#f3f4f6", borderRadius: 3 },
  tableRow:      { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  thText:        { fontSize: 7, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4 },
  tdText:        { fontSize: 8, color: "#374151" },
  tdBold:        { fontSize: 8, fontWeight: 600, color: "#111827" },
  colNum:        { width: 60 },
  colDate:       { width: 56 },
  colDue:        { width: 56 },
  colStatus:     { width: 44 },
  colCurrency:   { width: 32 },
  colAmt:        { flex: 1, textAlign: "right" },
  colTDS:        { width: 58, textAlign: "right" },
  colNet:        { width: 70, textAlign: "right" },
  colBal:        { width: 70, textAlign: "right" },
  // Summary
  summarySection: { marginTop: 20, alignItems: "flex-end" },
  summaryRow:    { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 6 },
  summaryLabel:  { width: 110, fontSize: 8, color: "#6b7280", textAlign: "right", paddingRight: 12 },
  summaryValue:  { width: 190, fontSize: 8, color: "#374151", textAlign: "right" },
  summaryRule:   { borderTopWidth: 1.5, borderTopColor: "#111827", width: 312, marginTop: 3, marginBottom: 3 },
  grandLabel:    { width: 110, fontSize: 10, fontWeight: 600, color: "#111827", textAlign: "right", paddingRight: 12 },
  grandValue:    { width: 190, fontSize: 10, fontWeight: 600, color: "#111827", textAlign: "right" },
  // Footer
  footer:        { position: "absolute", bottom: 24, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between" },
  footerText:    { fontSize: 7, color: "#d1d5db" },
  footerNote:    { fontSize: 7, color: "#9ca3af" },
});

export function StatementPDF({ client, freelancer, invoices, summary, generatedAt }: StatementPDFProps) {
  // Detect whether any invoice uses a currency other than the first (multi-currency statement)
  const currencies = [...new Set(invoices.map((i) => i.currency))];
  const isMixed = currencies.length > 1;
  const hasTDS = invoices.some((i) => i.tdsPercent > 0);

  // Summary per currency, so amounts in different currencies never add up
  const sumBy = (field: "total" | "collected" | "balance") =>
    currencies
      .map((cur) => [cur, invoices.filter((i) => i.currency === cur).reduce((n, i) => n + i[field], 0)] as const)
      .filter(([, amount], _, all) => amount > 0 || all.length === 1)
      .map(([cur, amount]) => formatCurrency(amount, cur))
      .join(" + ") || formatCurrency(0, currencies[0] ?? "USD");

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.titleBlock}>
            <Text style={s.title}>Client Statement</Text>
            <Text style={s.subtitle}>
              Summary of all invoices issued to {client.name}
            </Text>
          </View>
          <View style={s.metaRight}>
            <Text style={s.metaLine}>Generated</Text>
            <Text style={s.metaValue}>{fmt(generatedAt)}</Text>
          </View>
        </View>

        {/* From / To */}
        <View style={s.parties}>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>From</Text>
            <Text style={s.partyName}>{freelancer.name}</Text>
            <Text style={s.partyDetail}>{freelancer.email}</Text>
          </View>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>To</Text>
            <Text style={s.partyName}>{client.name}</Text>
            {client.company && <Text style={s.partyDetail}>{client.company}</Text>}
            <Text style={s.partyDetail}>{client.email}</Text>
            {client.country && <Text style={s.partyDetail}>{client.country}</Text>}
          </View>
        </View>

        <View style={s.divider} />

        {/* Table header */}
        <View style={s.tableHeader}>
          <Text style={[s.thText, s.colNum]}>Invoice</Text>
          <Text style={[s.thText, s.colDate]}>Issue Date</Text>
          <Text style={[s.thText, s.colDue]}>Due Date</Text>
          <Text style={[s.thText, s.colStatus]}>Status</Text>
          {isMixed && <Text style={[s.thText, s.colCurrency]}>CCY</Text>}
          <Text style={[s.thText, s.colAmt]}>Amount</Text>
          {hasTDS && <Text style={[s.thText, s.colTDS]}>TDS</Text>}
          {hasTDS && <Text style={[s.thText, s.colNet]}>Net</Text>}
          <Text style={[s.thText, s.colBal]}>Balance</Text>
        </View>

        {/* Invoice rows */}
        {invoices.map((inv) => (
          <View key={inv.id} style={s.tableRow}>
            <Text style={[s.tdBold, s.colNum]}>{inv.number}</Text>
            <Text style={[s.tdText, s.colDate]}>{fmt(inv.issueDate)}</Text>
            <Text style={[s.tdText, s.colDue]}>{fmt(inv.dueDate)}</Text>
            <Text style={[s.tdText, s.colStatus, {
              color: inv.status === "PAID" ? "#16a34a"
                   : inv.status === "OVERDUE" ? "#dc2626"
                   : inv.status === "SENT" ? "#2563eb"
                   : "#6b7280",
            }]}>
              {STATUS_LABEL[inv.status] ?? inv.status}
            </Text>
            {isMixed && <Text style={[s.tdText, s.colCurrency]}>{inv.currency}</Text>}
            <Text style={[s.tdText, s.colAmt]}>
              {formatCurrency(inv.total, inv.currency)}
            </Text>
            {hasTDS && (
              <Text style={[s.tdText, s.colTDS, { color: inv.tdsPercent > 0 ? "#ef4444" : "#9ca3af" }]}>
                {inv.tdsPercent > 0 ? `−${formatCurrency(inv.tdsAmount, inv.currency)}` : "—"}
              </Text>
            )}
            {hasTDS && (
              <Text style={[s.tdBold, s.colNet]}>
                {inv.tdsPercent > 0
                  ? formatCurrency(inv.netReceivable, inv.currency)
                  : formatCurrency(inv.total, inv.currency)}
              </Text>
            )}
            <Text style={[s.tdText, s.colBal, { color: inv.balance > 0 ? "#111827" : "#9ca3af" }]}>
              {inv.balance > 0 ? formatCurrency(inv.balance, inv.currency) : "—"}
            </Text>
          </View>
        ))}

        {/* Summary */}
        <View style={s.summarySection}>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Total Invoiced ({summary.invoiceCount})</Text>
            <Text style={s.summaryValue}>
              {sumBy("total")}
            </Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Received ({summary.paidCount} paid)</Text>
            <Text style={[s.summaryValue, { color: "#16a34a" }]}>
              {sumBy("collected")}
            </Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Outstanding</Text>
            <Text style={[s.summaryValue, { color: summary.totalOutstanding > 0 ? "#2563eb" : "#6b7280" }]}>
              {sumBy("balance")}
            </Text>
          </View>
          <View style={s.summaryRule} />
          <View style={s.summaryRow}>
            <Text style={s.grandLabel}>Balance due</Text>
            <Text style={[s.grandValue, { color: summary.totalOutstanding > 0 ? "#dc2626" : "#16a34a" }]}>
              {summary.totalOutstanding > 0 ? sumBy("balance") : "Nil"}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>Generated by Hisab — open-source invoicing for Nepali freelancers</Text>
          {hasTDS && (
            <Text style={s.footerNote}>* TDS is withheld and deposited with IRD by the client; balances are net of TDS</Text>
          )}
        </View>
      </Page>
    </Document>
  );
}
