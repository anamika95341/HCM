import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function downloadCaseSummaryPdf({ filename, title, rows = [], timeline = [] }) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(title || "Case Summary", 14, 18);

  autoTable(doc, {
    startY: 26,
    head: [["Field", "Value"]],
    body: rows.map(([label, value]) => [label, value || "-"]),
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 2.4 },
    headStyles: { fillColor: [25, 71, 153] },
  });

  if (timeline.length) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [["When", "Action", "By", "Notes"]],
      body: timeline.slice(0, 12).map((item) => [
        new Date(item.createdAt).toLocaleString(),
        item.action,
        item.createdByName || item.sourceLabel || "-",
        item.notes || "-",
      ]),
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2.2 },
      headStyles: { fillColor: [14, 116, 144] },
    });
  }

  doc.save(filename || "case-summary.pdf");
}
