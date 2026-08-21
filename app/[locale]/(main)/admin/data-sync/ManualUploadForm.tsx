"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SOURCE_FORMATS } from "@/lib/constants/source-formats";
import { importMigrationData } from "@/app/actions/admin/import-data";

export function ManualUploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceFormat, setSourceFormat] = useState<string>("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];

    if (!sourceFormat) {
      toast.error("Select a source format before uploading.");
      return;
    }
    if (!file) {
      toast.error("Choose a .csv or .xlsx file to upload.");
      return;
    }

    const formData = new FormData();
    formData.set("sourceFormat", sourceFormat);
    formData.set("file", file);

    startTransition(async () => {
      const result = await importMigrationData(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload Migration Data (Excel/CSV)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Download the current invitation-round or quota data from a source&apos;s official page below, then upload
          it here to sync the database. Re-uploading for the same format replaces its previous import.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Source Format</label>
            <Select value={sourceFormat} onValueChange={setSourceFormat} disabled={isPending}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a format..." />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_FORMATS.map((format) => (
                  <SelectItem key={format.id} value={format.id}>
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-slate-600">File (.xlsx, .csv)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              disabled={isPending}
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
            />
            {fileName && <p className="truncate text-xs text-slate-400">{fileName}</p>}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isPending ? "Uploading..." : "Upload & Sync Database"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
