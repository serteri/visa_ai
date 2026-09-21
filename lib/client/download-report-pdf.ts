/**
 * Browser download of a report's PDF from the server route (app/api/reports/[reportId]/pdf) -- the same
 * route the checkout success page's "Download Report" button opens. The PDF is generated on the server
 * from the stored report, so every download carries the stored profile (age, family status, ...) and the
 * same totals; there is deliberately no client-side PDF generator any more. The route keeps its own
 * authorisation: it only serves a report that is unlocked.
 *
 * Throws when the server does not answer with a PDF, so the caller can show a visible error.
 */
export async function downloadReportPdf(reportId: string, fileName: string): Promise<void> {
  if (!reportId) throw new Error("Missing report id");

  const response = await fetch(`/api/reports/${encodeURIComponent(reportId)}/pdf`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`PDF download failed (HTTP ${response.status})`);
  if (!(response.headers.get("content-type") ?? "").includes("application/pdf")) {
    throw new Error("PDF download failed (the server did not return a PDF)");
  }

  const url = URL.createObjectURL(await response.blob());
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}
