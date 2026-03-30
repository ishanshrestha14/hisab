import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/utils";

Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa2ZL7SUc.woff2",
      fontWeight: 600,
    },
  ],
});

const s = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    color: "#111827",
    padding: 48,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 40,
  },
  logo: {
    fontSize: 22,
    fontWeight: 600,
    color: "#f59e0b",
  },
  logoSub: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 2,
  },
  invoiceLabel: {
    fontSize: 20,
    fontWeight: 600,
    color: "#111827",
    textAlign: "right",
  },
  invoiceNumber: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "right",
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 36,
  },
  metaBlock: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 10,
    color: "#111827",
    lineHeight: 1.5,
  },
  metaValueBold: {
    fontSize: 11,
    fontWeight: 600,
    color: "#111827",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  colDesc: { flex: 1 },
  colNum: { width: 60, textAlign: "right" },
  thText: {
    fontSize: 9,
    color: "#6b7280",
    fontWeight: 600,
    textTransform: "uppercase",
  },
  tdText: {
    fontSize: 10,
    color: "#374151",
  },
  totalsSection: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
    gap: 40,
  },
  totalLabel: {
    fontSize: 10,
    color: "#6b7280",
    width: 80,
    textAlign: "right",
  },
  totalValue: {
    fontSize: 10,
    color: "#111827",
    width: 80,
    textAlign: "right",
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 40,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#111827",
    width: 80,
    textAlign: "right",
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 600,
    color: "#f59e0b",
    width: 80,
    textAlign: "right",
  },
  nprNote: {
    fontSize: 9,
    color: "#9ca3af",
    textAlign: "right",
    marginTop: 4,
  },
  notes: {
    marginTop: 40,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  notesLabel: {
    fontSize: 9,
    color: "#9ca3af",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 10,
    color: "#374151",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    textAlign: "center",
    fontSize: 9,
    color: "#d1d5db",
  },
});

export interface InvoicePDFProps {
  number: string;
  status: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  notes?: string | null;
  total: number;
  nprRate?: number | null;
  nprTotal?: number | null;
  client: {
    name: string;
    email: string;
    company?: string | null;
    country?: string | null;
  };
  freelancer: { name: string; email: string };
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function InvoicePDF({
  number,
  currency,
  issueDate,
  dueDate,
  notes,
  total,
  nprRate,
  nprTotal,
  client,
  freelancer,
  lineItems,
}: InvoicePDFProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.logo}>हिसाब Hisab</Text>
            <Text style={s.logoSub}>Invoicing for Nepali Freelancers</Text>
          </View>
          <View>
            <Text style={s.invoiceLabel}>INVOICE</Text>
            <Text style={s.invoiceNumber}>{number}</Text>
          </View>
        </View>

        {/* From / To / Dates */}
        <View style={s.metaRow}>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>From</Text>
            <Text style={s.metaValueBold}>{freelancer.name}</Text>
            <Text style={s.metaValue}>{freelancer.email}</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Bill To</Text>
            <Text style={s.metaValueBold}>{client.name}</Text>
            {client.company && <Text style={s.metaValue}>{client.company}</Text>}
            <Text style={s.metaValue}>{client.email}</Text>
            {client.country && <Text style={s.metaValue}>{client.country}</Text>}
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaLabel}>Issue Date</Text>
            <Text style={[s.metaValue, { marginBottom: 10 }]}>{fmt(issueDate)}</Text>
            <Text style={s.metaLabel}>Due Date</Text>
            <Text style={s.metaValue}>{fmt(dueDate)}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Line items table */}
        <View style={s.tableHeader}>
          <Text style={[s.thText, s.colDesc]}>Description</Text>
          <Text style={[s.thText, s.colNum]}>Qty</Text>
          <Text style={[s.thText, s.colNum]}>Unit Price</Text>
          <Text style={[s.thText, s.colNum]}>Total</Text>
        </View>

        {lineItems.map((item, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={[s.tdText, s.colDesc]}>{item.description}</Text>
            <Text style={[s.tdText, s.colNum]}>{item.quantity}</Text>
            <Text style={[s.tdText, s.colNum]}>
              {formatCurrency(item.unitPrice, currency)}
            </Text>
            <Text style={[s.tdText, s.colNum]}>
              {formatCurrency(item.total, currency)}
            </Text>
          </View>
        ))}

        {/* Totals */}
        <View style={s.totalsSection}>
          <View style={s.grandTotal}>
            <Text style={s.grandTotalLabel}>Total</Text>
            <Text style={s.grandTotalValue}>{formatCurrency(total, currency)}</Text>
          </View>
          {nprTotal && nprRate && (
            <Text style={s.nprNote}>
              ≈ {formatCurrency(nprTotal, "NPR")} at 1 {currency} = ₨{nprRate.toFixed(2)}
            </Text>
          )}
        </View>

        {/* Notes */}
        {notes && (
          <View style={s.notes}>
            <Text style={s.notesLabel}>Notes</Text>
            <Text style={s.notesText}>{notes}</Text>
          </View>
        )}

        <Text style={s.footer}>
          Generated by Hisab — open-source invoicing for Nepali freelancers
        </Text>
      </Page>
    </Document>
  );
}
