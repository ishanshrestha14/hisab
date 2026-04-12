import {
  Document,
  Page,
  Text,
  View,
  Image,
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

export interface InvoicePDFProps {
  number: string;
  status: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  notes?: string | null;
  total: number;
  tdsPercent?: number | null;
  tdsAmount?: number | null;
  netReceivable?: number | null;
  nprRate?: number | null;
  nprTotal?: number | null;
  template?: string | null;
  brandColor?: string | null;
  logoUrl?: string | null;
  client: {
    name: string;
    email: string;
    company?: string | null;
    country?: string | null;
  };
  freelancer: {
    name: string;
    email: string;
    pan?: string | null;
    vatNumber?: string | null;
  };
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── Classic Template ──────────────────────────────────────────────────────────

const classic = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 10, color: "#111827", padding: 48, backgroundColor: "#ffffff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 },
  logo: { fontSize: 20, fontWeight: 600 },
  logoSub: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  logoImg: { width: 80, height: 40, objectFit: "contain" },
  invoiceLabel: { fontSize: 20, fontWeight: 600, color: "#111827", textAlign: "right" },
  invoiceNumber: { fontSize: 11, color: "#6b7280", textAlign: "right", marginTop: 4 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 36 },
  metaBlock: { flex: 1 },
  metaLabel: { fontSize: 9, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  metaValue: { fontSize: 10, color: "#111827", lineHeight: 1.5 },
  metaValueBold: { fontSize: 11, fontWeight: 600, color: "#111827" },
  divider: { borderBottomWidth: 1, borderBottomColor: "#e5e7eb", marginBottom: 16 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f9fafb", borderRadius: 4, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 2 },
  tableRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  colDesc: { flex: 1 },
  colNum: { width: 70, textAlign: "right" },
  thText: { fontSize: 9, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" },
  tdText: { fontSize: 10, color: "#374151" },
  totalsSection: { marginTop: 16, alignItems: "flex-end" },
  grandTotal: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#e5e7eb", gap: 40 },
  grandTotalLabel: { fontSize: 12, fontWeight: 600, color: "#111827", width: 80, textAlign: "right" },
  grandTotalValue: { fontSize: 12, fontWeight: 600, width: 80, textAlign: "right" },
  nprNote: { fontSize: 9, color: "#9ca3af", textAlign: "right", marginTop: 4 },
  notes: { marginTop: 40, padding: 12, backgroundColor: "#f9fafb", borderRadius: 4 },
  notesLabel: { fontSize: 9, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 },
  notesText: { fontSize: 10, color: "#374151", lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, textAlign: "center", fontSize: 9, color: "#d1d5db" },
});

function ClassicTemplate({ number, currency, issueDate, dueDate, notes, total, tdsPercent, tdsAmount, netReceivable, nprRate, nprTotal, client, freelancer, lineItems, brandColor, logoUrl }: InvoicePDFProps) {
  const accent = brandColor ?? "#f59e0b";
  return (
    <>
      <View style={classic.header}>
        <View>
          {logoUrl ? (
            <Image src={logoUrl} style={classic.logoImg} />
          ) : (
            <>
              <Text style={[classic.logo, { color: accent }]}>हिसाब Hisab</Text>
              <Text style={classic.logoSub}>Invoicing for Nepali Freelancers</Text>
            </>
          )}
        </View>
        <View>
          <Text style={classic.invoiceLabel}>INVOICE</Text>
          <Text style={classic.invoiceNumber}>{number}</Text>
        </View>
      </View>

      <View style={classic.metaRow}>
        <View style={classic.metaBlock}>
          <Text style={classic.metaLabel}>From</Text>
          <Text style={classic.metaValueBold}>{freelancer.name}</Text>
          <Text style={classic.metaValue}>{freelancer.email}</Text>
          {freelancer.pan && <Text style={classic.metaValue}>PAN: {freelancer.pan}</Text>}
          {freelancer.vatNumber && <Text style={classic.metaValue}>VAT: {freelancer.vatNumber}</Text>}
        </View>
        <View style={classic.metaBlock}>
          <Text style={classic.metaLabel}>Bill To</Text>
          <Text style={classic.metaValueBold}>{client.name}</Text>
          {client.company && <Text style={classic.metaValue}>{client.company}</Text>}
          <Text style={classic.metaValue}>{client.email}</Text>
          {client.country && <Text style={classic.metaValue}>{client.country}</Text>}
        </View>
        <View style={classic.metaBlock}>
          <Text style={classic.metaLabel}>Issue Date</Text>
          <Text style={[classic.metaValue, { marginBottom: 10 }]}>{fmt(issueDate)}</Text>
          <Text style={classic.metaLabel}>Due Date</Text>
          <Text style={classic.metaValue}>{fmt(dueDate)}</Text>
        </View>
      </View>

      <View style={classic.divider} />

      <View style={classic.tableHeader}>
        <Text style={[classic.thText, classic.colDesc]}>Description</Text>
        <Text style={[classic.thText, classic.colNum]}>Qty</Text>
        <Text style={[classic.thText, classic.colNum]}>Unit Price</Text>
        <Text style={[classic.thText, classic.colNum]}>Total</Text>
      </View>
      {lineItems.map((item, i) => (
        <View key={i} style={classic.tableRow}>
          <Text style={[classic.tdText, classic.colDesc]}>{item.description}</Text>
          <Text style={[classic.tdText, classic.colNum]}>{item.quantity}</Text>
          <Text style={[classic.tdText, classic.colNum]}>{formatCurrency(item.unitPrice, currency)}</Text>
          <Text style={[classic.tdText, classic.colNum]}>{formatCurrency(item.total, currency)}</Text>
        </View>
      ))}

      <View style={classic.totalsSection}>
        {tdsPercent && tdsPercent > 0 && tdsAmount != null && netReceivable != null ? (
          <>
            <View style={classic.grandTotal}>
              <Text style={classic.grandTotalLabel}>Gross</Text>
              <Text style={classic.grandTotalValue}>{formatCurrency(total, currency)}</Text>
            </View>
            <View style={classic.grandTotal}>
              <Text style={classic.grandTotalLabel}>TDS ({tdsPercent}%)</Text>
              <Text style={[classic.grandTotalValue, { color: "#ef4444" }]}>−{formatCurrency(tdsAmount, currency)}</Text>
            </View>
            <View style={classic.grandTotal}>
              <Text style={classic.grandTotalLabel}>Net</Text>
              <Text style={[classic.grandTotalValue, { color: accent }]}>{formatCurrency(netReceivable, currency)}</Text>
            </View>
          </>
        ) : (
          <View style={classic.grandTotal}>
            <Text style={classic.grandTotalLabel}>Total</Text>
            <Text style={[classic.grandTotalValue, { color: accent }]}>{formatCurrency(total, currency)}</Text>
          </View>
        )}
        {nprTotal && nprRate && (
          <Text style={classic.nprNote}>
            ≈ {formatCurrency(nprTotal, "NPR")} at 1 {currency} = ₨{nprRate.toFixed(2)}
          </Text>
        )}
      </View>

      {notes && (
        <View style={classic.notes}>
          <Text style={classic.notesLabel}>Notes</Text>
          <Text style={classic.notesText}>{notes}</Text>
        </View>
      )}

      <Text style={classic.footer}>Generated by Hisab — open-source invoicing for Nepali freelancers</Text>
    </>
  );
}

// ─── Modern Template ───────────────────────────────────────────────────────────

const modern = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 10, color: "#111827", padding: 0, backgroundColor: "#ffffff" },
  headerBand: { paddingHorizontal: 48, paddingVertical: 36, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logoArea: { flex: 1 },
  logoImg: { width: 90, height: 45, objectFit: "contain" },
  logoText: { fontSize: 22, fontWeight: 600, color: "#ffffff" },
  logoSub: { fontSize: 9, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  invoiceArea: { alignItems: "flex-end" },
  invoiceLabel: { fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.8)", letterSpacing: 2, textTransform: "uppercase" },
  invoiceNumber: { fontSize: 26, fontWeight: 600, color: "#ffffff", marginTop: 4 },
  body: { paddingHorizontal: 48, paddingTop: 36, paddingBottom: 48 },
  metaRow: { flexDirection: "row", marginBottom: 32, gap: 24 },
  metaBlock: { flex: 1, padding: 16, backgroundColor: "#f9fafb", borderRadius: 6 },
  metaLabel: { fontSize: 8, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  metaValue: { fontSize: 10, color: "#374151", lineHeight: 1.5 },
  metaValueBold: { fontSize: 11, fontWeight: 600, color: "#111827" },
  tableHeader: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 12, marginBottom: 0, borderRadius: 4 },
  tableRow: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  colDesc: { flex: 1 },
  colNum: { width: 70, textAlign: "right" },
  thText: { fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#ffffff" },
  tdText: { fontSize: 10, color: "#374151" },
  totalsBox: { marginTop: 24, marginLeft: "auto", width: 260, borderRadius: 8, overflow: "hidden" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 8, backgroundColor: "#f9fafb" },
  grandTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  totalLabel: { fontSize: 11, fontWeight: 600, color: "#ffffff" },
  totalValue: { fontSize: 14, fontWeight: 600, color: "#ffffff" },
  nprNote: { fontSize: 9, color: "#9ca3af", textAlign: "right", marginTop: 6, paddingRight: 0 },
  notes: { marginTop: 32, padding: 16, backgroundColor: "#f9fafb", borderRadius: 6 },
  notesLabel: { fontSize: 8, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  notesText: { fontSize: 10, color: "#374151", lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, textAlign: "center", fontSize: 9, color: "#d1d5db" },
});

function ModernTemplate({ number, currency, issueDate, dueDate, notes, total, tdsPercent, tdsAmount, netReceivable, nprRate, nprTotal, client, freelancer, lineItems, brandColor, logoUrl }: InvoicePDFProps) {
  const accent = brandColor ?? "#f59e0b";
  return (
    <>
      {/* Colored header band */}
      <View style={[modern.headerBand, { backgroundColor: accent }]}>
        <View style={modern.logoArea}>
          {logoUrl ? (
            <Image src={logoUrl} style={modern.logoImg} />
          ) : (
            <>
              <Text style={modern.logoText}>हिसाब Hisab</Text>
              <Text style={modern.logoSub}>Invoicing for Nepali Freelancers</Text>
            </>
          )}
        </View>
        <View style={modern.invoiceArea}>
          <Text style={modern.invoiceLabel}>Invoice</Text>
          <Text style={modern.invoiceNumber}>{number}</Text>
        </View>
      </View>

      <View style={modern.body}>
        {/* Meta blocks */}
        <View style={modern.metaRow}>
          <View style={modern.metaBlock}>
            <Text style={modern.metaLabel}>From</Text>
            <Text style={modern.metaValueBold}>{freelancer.name}</Text>
            <Text style={modern.metaValue}>{freelancer.email}</Text>
            {freelancer.pan && <Text style={modern.metaValue}>PAN: {freelancer.pan}</Text>}
            {freelancer.vatNumber && <Text style={modern.metaValue}>VAT: {freelancer.vatNumber}</Text>}
          </View>
          <View style={modern.metaBlock}>
            <Text style={modern.metaLabel}>Bill To</Text>
            <Text style={modern.metaValueBold}>{client.name}</Text>
            {client.company && <Text style={modern.metaValue}>{client.company}</Text>}
            <Text style={modern.metaValue}>{client.email}</Text>
            {client.country && <Text style={modern.metaValue}>{client.country}</Text>}
          </View>
          <View style={modern.metaBlock}>
            <Text style={modern.metaLabel}>Dates</Text>
            <Text style={[modern.metaValue, { marginBottom: 2 }]}>Issued: {fmt(issueDate)}</Text>
            <Text style={modern.metaValue}>Due: {fmt(dueDate)}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={[modern.tableHeader, { backgroundColor: accent }]}>
          <Text style={[modern.thText, modern.colDesc]}>Description</Text>
          <Text style={[modern.thText, modern.colNum]}>Qty</Text>
          <Text style={[modern.thText, modern.colNum]}>Unit Price</Text>
          <Text style={[modern.thText, modern.colNum]}>Total</Text>
        </View>
        {lineItems.map((item, i) => (
          <View key={i} style={[modern.tableRow, { backgroundColor: i % 2 === 0 ? "#ffffff" : "#fafafa" }]}>
            <Text style={[modern.tdText, modern.colDesc]}>{item.description}</Text>
            <Text style={[modern.tdText, modern.colNum]}>{item.quantity}</Text>
            <Text style={[modern.tdText, modern.colNum]}>{formatCurrency(item.unitPrice, currency)}</Text>
            <Text style={[modern.tdText, modern.colNum]}>{formatCurrency(item.total, currency)}</Text>
          </View>
        ))}

        {/* Totals box */}
        <View style={modern.totalsBox}>
          {tdsPercent && tdsPercent > 0 && tdsAmount != null && netReceivable != null ? (
            <>
              <View style={modern.totalRow}>
                <Text style={[modern.totalLabel, { color: "#374151" }]}>Gross</Text>
                <Text style={[modern.totalValue, { color: "#374151" }]}>{formatCurrency(total, currency)}</Text>
              </View>
              <View style={modern.totalRow}>
                <Text style={[modern.totalLabel, { color: "#374151" }]}>TDS ({tdsPercent}%)</Text>
                <Text style={[modern.totalValue, { color: "#ef4444" }]}>−{formatCurrency(tdsAmount, currency)}</Text>
              </View>
              <View style={[modern.grandTotalRow, { backgroundColor: accent }]}>
                <Text style={modern.totalLabel}>Net Receivable</Text>
                <Text style={modern.totalValue}>{formatCurrency(netReceivable, currency)}</Text>
              </View>
            </>
          ) : (
            <View style={[modern.grandTotalRow, { backgroundColor: accent }]}>
              <Text style={modern.totalLabel}>Total Due</Text>
              <Text style={modern.totalValue}>{formatCurrency(total, currency)}</Text>
            </View>
          )}
        </View>
        {nprTotal && nprRate && (
          <Text style={modern.nprNote}>
            ≈ {formatCurrency(nprTotal, "NPR")} at 1 {currency} = ₨{nprRate.toFixed(2)}
          </Text>
        )}

        {notes && (
          <View style={modern.notes}>
            <Text style={modern.notesLabel}>Notes</Text>
            <Text style={modern.notesText}>{notes}</Text>
          </View>
        )}
      </View>

      <Text style={modern.footer}>Generated by Hisab — open-source invoicing for Nepali freelancers</Text>
    </>
  );
}

// ─── Minimal Template ──────────────────────────────────────────────────────────

const minimal = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 10, color: "#111827", padding: 56, backgroundColor: "#ffffff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 48 },
  logoImg: { width: 70, height: 35, objectFit: "contain" },
  logoText: { fontSize: 14, fontWeight: 600, color: "#111827" },
  logoSub: { fontSize: 8, color: "#9ca3af", marginTop: 2 },
  invoiceRight: { alignItems: "flex-end" },
  invoiceLabel: { fontSize: 9, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1.5 },
  invoiceNumber: { fontSize: 16, fontWeight: 600, color: "#111827", marginTop: 2 },
  rule: { borderBottomWidth: 1, borderBottomColor: "#e5e7eb", marginBottom: 32 },
  metaRow: { flexDirection: "row", marginBottom: 40, gap: 0 },
  metaBlock: { flex: 1 },
  metaLabel: { fontSize: 8, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  metaValue: { fontSize: 10, color: "#374151", lineHeight: 1.6 },
  metaValueBold: { fontSize: 11, fontWeight: 600, color: "#111827" },
  tableHeader: { flexDirection: "row", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#111827", marginBottom: 0 },
  tableRow: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  colDesc: { flex: 1 },
  colNum: { width: 70, textAlign: "right" },
  thText: { fontSize: 8, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 },
  tdText: { fontSize: 10, color: "#374151" },
  totalRule: { borderBottomWidth: 1, borderBottomColor: "#111827", marginTop: 16 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 12 },
  totalLabel: { fontSize: 11, fontWeight: 600, color: "#111827" },
  totalValue: { fontSize: 14, fontWeight: 600, color: "#111827" },
  nprNote: { fontSize: 9, color: "#9ca3af", textAlign: "right", marginTop: 4 },
  notes: { marginTop: 40, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  notesLabel: { fontSize: 8, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  notesText: { fontSize: 10, color: "#374151", lineHeight: 1.6 },
  footer: { position: "absolute", bottom: 32, left: 56, right: 56, textAlign: "center", fontSize: 8, color: "#d1d5db" },
});

function MinimalTemplate({ number, currency, issueDate, dueDate, notes, total, tdsPercent, tdsAmount, netReceivable, nprRate, nprTotal, client, freelancer, lineItems, logoUrl }: InvoicePDFProps) {
  return (
    <>
      <View style={minimal.header}>
        <View>
          {logoUrl ? (
            <Image src={logoUrl} style={minimal.logoImg} />
          ) : (
            <>
              <Text style={minimal.logoText}>हिसाब Hisab</Text>
              <Text style={minimal.logoSub}>Invoicing for Nepali Freelancers</Text>
            </>
          )}
        </View>
        <View style={minimal.invoiceRight}>
          <Text style={minimal.invoiceLabel}>Invoice</Text>
          <Text style={minimal.invoiceNumber}>{number}</Text>
        </View>
      </View>

      <View style={minimal.rule} />

      <View style={minimal.metaRow}>
        <View style={minimal.metaBlock}>
          <Text style={minimal.metaLabel}>From</Text>
          <Text style={minimal.metaValueBold}>{freelancer.name}</Text>
          <Text style={minimal.metaValue}>{freelancer.email}</Text>
          {freelancer.pan && <Text style={minimal.metaValue}>PAN: {freelancer.pan}</Text>}
          {freelancer.vatNumber && <Text style={minimal.metaValue}>VAT: {freelancer.vatNumber}</Text>}
        </View>
        <View style={minimal.metaBlock}>
          <Text style={minimal.metaLabel}>Bill To</Text>
          <Text style={minimal.metaValueBold}>{client.name}</Text>
          {client.company && <Text style={minimal.metaValue}>{client.company}</Text>}
          <Text style={minimal.metaValue}>{client.email}</Text>
          {client.country && <Text style={minimal.metaValue}>{client.country}</Text>}
        </View>
        <View style={minimal.metaBlock}>
          <Text style={minimal.metaLabel}>Issue Date</Text>
          <Text style={[minimal.metaValue, { marginBottom: 8 }]}>{fmt(issueDate)}</Text>
          <Text style={minimal.metaLabel}>Due Date</Text>
          <Text style={minimal.metaValue}>{fmt(dueDate)}</Text>
        </View>
      </View>

      <View style={minimal.tableHeader}>
        <Text style={[minimal.thText, minimal.colDesc]}>Description</Text>
        <Text style={[minimal.thText, minimal.colNum]}>Qty</Text>
        <Text style={[minimal.thText, minimal.colNum]}>Unit Price</Text>
        <Text style={[minimal.thText, minimal.colNum]}>Total</Text>
      </View>
      {lineItems.map((item, i) => (
        <View key={i} style={minimal.tableRow}>
          <Text style={[minimal.tdText, minimal.colDesc]}>{item.description}</Text>
          <Text style={[minimal.tdText, minimal.colNum]}>{item.quantity}</Text>
          <Text style={[minimal.tdText, minimal.colNum]}>{formatCurrency(item.unitPrice, currency)}</Text>
          <Text style={[minimal.tdText, minimal.colNum]}>{formatCurrency(item.total, currency)}</Text>
        </View>
      ))}

      <View style={minimal.totalRule} />
      {tdsPercent && tdsPercent > 0 && tdsAmount != null && netReceivable != null ? (
        <>
          <View style={[minimal.totalRow, { paddingTop: 10 }]}>
            <Text style={[minimal.totalLabel, { fontSize: 10, fontWeight: 400 }]}>Gross</Text>
            <Text style={[minimal.totalValue, { fontSize: 10, fontWeight: 400 }]}>{formatCurrency(total, currency)}</Text>
          </View>
          <View style={[minimal.totalRow, { paddingTop: 6 }]}>
            <Text style={[minimal.totalLabel, { fontSize: 10, fontWeight: 400 }]}>TDS ({tdsPercent}%)</Text>
            <Text style={[minimal.totalValue, { fontSize: 10, fontWeight: 400, color: "#ef4444" }]}>−{formatCurrency(tdsAmount, currency)}</Text>
          </View>
          <View style={[minimal.totalRow, { paddingTop: 8, borderTopWidth: 1, borderTopColor: "#e5e7eb", marginTop: 4 }]}>
            <Text style={minimal.totalLabel}>Net Receivable</Text>
            <Text style={minimal.totalValue}>{formatCurrency(netReceivable, currency)}</Text>
          </View>
        </>
      ) : (
        <View style={minimal.totalRow}>
          <Text style={minimal.totalLabel}>Total Due</Text>
          <Text style={minimal.totalValue}>{formatCurrency(total, currency)}</Text>
        </View>
      )}
      {nprTotal && nprRate && (
        <Text style={minimal.nprNote}>
          ≈ {formatCurrency(nprTotal, "NPR")} at 1 {currency} = ₨{nprRate.toFixed(2)}
        </Text>
      )}

      {notes && (
        <View style={minimal.notes}>
          <Text style={minimal.notesLabel}>Notes</Text>
          <Text style={minimal.notesText}>{notes}</Text>
        </View>
      )}

      <Text style={minimal.footer}>Generated by Hisab — open-source invoicing for Nepali freelancers</Text>
    </>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function InvoicePDF(props: InvoicePDFProps) {
  const t = props.template ?? "classic";
  return (
    <Document>
      <Page size="A4" style={{ fontFamily: "Inter" }}>
        {t === "modern" ? (
          <ModernTemplate {...props} />
        ) : t === "minimal" ? (
          <MinimalTemplate {...props} />
        ) : (
          <ClassicTemplate {...props} />
        )}
      </Page>
    </Document>
  );
}
