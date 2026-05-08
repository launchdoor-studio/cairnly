"use client";

import {
  CONTACT_IMPORT_FIELD_TARGETS,
  CONTACT_IMPORT_PREVIEW_ROW_CAP,
  type ContactImportFieldTarget,
  type ContactImportMapping,
} from "@cairnly/core";
import {
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  GitCompareArrows,
  Loader2,
  type LucideIcon,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  startTransition,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  commitContactImportAction,
  parseContactImportCsvAction,
  previewContactImportAction,
} from "@/app/(app)/contacts/import/actions";

const TARGET_LABELS: Record<ContactImportFieldTarget, string> = {
  ignore: "Ignore column",
  name: "Name",
  primaryEmail: "Email",
  primaryPhone: "Phone",
  type: "Type (person/company)",
  score: "Score",
  company: "Company (custom field)",
  source: "Source (custom field)",
};

function guessMapping(headers: string[]): ContactImportMapping {
  const m: ContactImportMapping = {};
  for (const h of headers) {
    const hl = h.toLowerCase();
    if (/\b(e-?mail|email address)\b/.test(hl) || hl === "email") {
      m[h] = "primaryEmail";
    } else if (/\b(full name|display name|contact name)\b/.test(hl) || hl === "name") {
      m[h] = "name";
    } else if (/\b(phone|mobile|tel)\b/.test(hl)) {
      m[h] = "primaryPhone";
    } else if (/\b(company|organization|org)\b/.test(hl)) {
      m[h] = "company";
    } else if (/\b(source|lead source|origin)\b/.test(hl)) {
      m[h] = "source";
    } else if (/\btype\b/.test(hl)) {
      m[h] = "type";
    } else if (/\b(score|rating)\b/.test(hl)) {
      m[h] = "score";
    } else {
      m[h] = "ignore";
    }
  }
  return m;
}

export function CsvImportPage() {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<{
    headers: string[];
    previewRows: string[][];
    totalDataRows: number;
    cappedRows: number;
    truncatedBySize: boolean;
  } | null>(null);
  const [mapping, setMapping] = useState<ContactImportMapping | null>(null);
  const [preview, setPreview] = useState<
    (Awaited<ReturnType<typeof previewContactImportAction>> & { ok: true }) | null
  >(null);
  const [allowDupRowIndices, setAllowDupRowIndices] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mappedFieldCount = useMemo(() => {
    if (!mapping) {
      return 0;
    }
    return Object.values(mapping).filter((v) => v !== "ignore").length;
  }, [mapping]);

  const onFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setPreview(null);
    setParseResult(null);
    setMapping(null);
    setAllowDupRowIndices([]);
    setFileName(file.name);

    setBusy(true);
    const text = await file.text();
    setRawContent(text);

    const out = await parseContactImportCsvAction(text);
    setBusy(false);

    if (!out.ok) {
      setError(out.message);
      return;
    }

    setParseResult({
      headers: out.headers,
      previewRows: out.previewRows,
      totalDataRows: out.totalDataRows,
      cappedRows: out.cappedRows,
      truncatedBySize: out.truncatedBySize,
    });
    setMapping(guessMapping(out.headers));
  }, []);

  const runPreview = useCallback(() => {
    if (!rawContent || !mapping) {
      return;
    }
    setError(null);
    setBusy(true);
    startTransition(async () => {
      const out = await previewContactImportAction({
        content: rawContent,
        mapping,
      });
      setBusy(false);
      if (!out.ok) {
        setError(out.message);
        setPreview(null);
        return;
      }
      setPreview(out);
      setAllowDupRowIndices([]);
    });
  }, [mapping, rawContent]);

  const runCommit = useCallback(() => {
    if (!rawContent || !mapping) {
      return;
    }
    setError(null);
    setBusy(true);
    startTransition(async () => {
      const out = await commitContactImportAction({
        content: rawContent,
        mapping,
        allowDuplicateRowIndices: allowDupRowIndices,
      });
      setBusy(false);
      if (!out.ok) {
        setError(out.message);
        return;
      }
      router.push("/contacts");
      router.refresh();
    });
  }, [allowDupRowIndices, mapping, rawContent, router]);

  const toggleAllowDup = useCallback((rowIndex: number) => {
    setAllowDupRowIndices((prev) =>
      prev.includes(rowIndex)
        ? prev.filter((r) => r !== rowIndex)
        : [...prev, rowIndex],
    );
  }, []);

  const updateMapping = useCallback(
    (header: string, target: ContactImportFieldTarget) => {
      setMapping((prev) => {
        if (!prev) {
          return prev;
        }
        return { ...prev, [header]: target };
      });
      setPreview(null);
    },
    [],
  );

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="grid min-h-screen w-full lg:grid-cols-[minmax(360px,28vw)_minmax(0,1fr)]">
        <aside className="border-b border-border bg-surface p-6 lg:border-b-0 lg:border-r lg:p-8">
          <Link
            href="/contacts"
            className="inline-flex items-center gap-2 rounded-input border border-border bg-bg px-3 py-2 text-[13px] font-medium text-muted transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to contacts
          </Link>

          <div className="mt-10">
            <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
              CSV import
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.06em] text-text">
              Import contacts (CSV)
            </h1>
            <p className="mt-4 max-w-sm text-[14px] text-muted">
              Upload UTF-8 CSV, map columns, review matches, commit when ready.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <StepCard
              icon={Upload}
              title="Upload"
              detail="Drop a UTF-8 CSV up to 1&nbsp;MiB. Up to 5,000 rows import per batch."
              done={Boolean(parseResult)}
            />
            <StepCard
              icon={FileSpreadsheet}
              title="Map columns"
              detail="Choose how each CSV column maps before any write takes place."
              done={Boolean(mapping && parseResult)}
            />
            <StepCard
              icon={GitCompareArrows}
              title="Dedupe preview"
              detail="Duplicates default to skipped; you can explicitly allow rows to import as new."
              done={Boolean(preview)}
            />
          </div>
        </aside>

        <section className="p-4 pb-10 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full space-y-5"
          >
            {error ? (
              <p
                className="rounded-card border border-border bg-bg px-4 py-3 text-[13px] text-error"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <article className="rounded-modal border border-border bg-surface p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
                    Import preview
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-text">
                    {fileName ?? "Choose a CSV file"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-[13px] text-muted">
                    {parseResult ? (
                      <>
                        {parseResult.totalDataRows} rows detected,&nbsp;
                        <span className="font-medium text-text">
                          {mappedFieldCount}
                        </span>{" "}
                        mapped fields (showing first{" "}
                        {Math.min(
                          CONTACT_IMPORT_PREVIEW_ROW_CAP,
                          parseResult.previewRows.length,
                        )}{" "}
                        rows below). Imports process at most {parseResult.cappedRows}{" "}
                        rows per run.
                      </>
                    ) : (
                      <>
                        Parsing runs on the server with row limits before any write
                        occurs.
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-input border border-border bg-bg px-3 py-2 text-[13px] font-medium text-text transition duration-150 ease-out hover:border-border-strong">
                    <Upload className="h-4 w-4 text-accent" aria-hidden />
                    {busy && !parseResult ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Reading…
                      </>
                    ) : (
                      "Select CSV"
                    )}
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="sr-only"
                      onChange={onFile}
                      disabled={busy}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy || !rawContent || !mapping}
                    onClick={runPreview}
                    className="inline-flex w-fit items-center gap-2 rounded-input border border-border bg-bg px-3 py-2 text-[13px] font-medium text-text transition duration-150 ease-out hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy && parseResult ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <GitCompareArrows className="h-4 w-4" aria-hidden />
                    )}
                    Run dedupe preview
                  </button>
                  <button
                    type="button"
                    disabled={busy || !preview}
                    onClick={runCommit}
                    className="inline-flex w-fit items-center gap-2 rounded-input bg-accent px-3 py-2 text-[13px] font-medium text-accent-fg transition duration-150 ease-out hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    Import after review
                  </button>
                </div>
              </div>
            </article>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
              <section className="space-y-5">
                <article className="rounded-modal border border-border bg-surface">
                  <div className="border-b border-border p-5">
                    <h3 className="font-semibold text-text">Column mapping</h3>
                    <p className="mt-1 text-[13px] text-muted">
                      Map each CSV header to a Cairnly field. Rows without a usable name
                      cannot be created.
                    </p>
                  </div>
                  {parseResult && mapping ? (
                    <div className="divide-y divide-border">
                      {parseResult.headers.map((header) => {
                        const sample =
                          parseResult.previewRows[0]?.[
                            parseResult.headers.indexOf(header)
                          ] ?? "";
                        const target = mapping[header] ?? "ignore";

                        return (
                          <div
                            key={header}
                            className="grid gap-3 p-4 md:grid-cols-[1fr_minmax(0,200px)_1.4fr]"
                          >
                            <div>
                              <p className="text-[12px] text-muted">CSV column</p>
                              <p className="mt-1 text-[13px] font-medium text-text">
                                {header}
                              </p>
                            </div>
                            <div>
                              <label
                                className="text-[12px] text-muted"
                                htmlFor={`map-${header}`}
                              >
                                Cairnly field
                              </label>
                              <select
                                id={`map-${header}`}
                                className="mt-1 h-10 w-full rounded-input border border-border bg-bg px-2 text-[13px] text-text outline-none transition duration-150 ease-out focus:border-border-strong focus:ring-2 focus:ring-ring"
                                value={target}
                                onChange={(event) =>
                                  updateMapping(
                                    header,
                                    event.target.value as ContactImportFieldTarget,
                                  )
                                }
                                disabled={busy}
                              >
                                {CONTACT_IMPORT_FIELD_TARGETS.map((key) => (
                                  <option key={key} value={key}>
                                    {TARGET_LABELS[key]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <p className="text-[12px] text-muted">Sample</p>
                              <p className="mt-1 truncate text-[13px] text-text">
                                {sample || "—"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="p-5 text-[13px] text-muted">
                      Upload a CSV to begin mapping.
                    </p>
                  )}
                </article>

                <article className="rounded-modal border border-border bg-surface">
                  <div className="border-b border-border p-5">
                    <h3 className="font-semibold text-text">Dedupe preview</h3>
                    <p className="mt-1 text-[13px] text-muted">
                      High-confidence matches reuse an existing email.&nbsp; Medium
                      matches reuse a normalized name.
                    </p>
                  </div>
                  {!preview ? (
                    <p className="p-5 text-[13px] text-muted">
                      Run preview after uploading and mapping columns.
                    </p>
                  ) : preview.duplicates.length === 0 ? (
                    <p className="p-5 text-[13px] text-text">
                      No likely duplicates surfaced for capped rows.&nbsp; You can still
                      import.
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {preview.duplicates.map((d) => {
                        const checked = allowDupRowIndices.includes(d.rowIndex);
                        const label =
                          d.confidence === "high"
                            ? "High confidence — email overlap"
                            : "Medium confidence — normalized name overlap";

                        return (
                          <div
                            key={`${d.rowIndex}-${d.matchedContactId}`}
                            className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <p className="text-[13px] font-medium text-text">
                                {d.csvName}
                              </p>
                              <p className="mt-1 text-[12px] text-muted">
                                {d.csvEmail ?? "no email"}
                              </p>
                              <p className="mt-1 text-[11px] text-subtle">
                                Matches {d.matchedName} ({d.matchedEmail ?? "no email"})
                              </p>
                            </div>
                            <div className="flex flex-col items-start gap-2 md:items-end">
                              <span className="rounded-full border border-border bg-bg px-2.5 py-1 text-[12px] text-muted">
                                {label}
                              </span>
                              <label className="flex cursor-pointer items-center gap-2 text-[12px] text-text">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleAllowDup(d.rowIndex)}
                                  className="rounded border-border"
                                  disabled={busy}
                                />
                                Import as new contact anyway
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>

                {preview?.sampleMappedRows.length ? (
                  <article className="rounded-modal border border-border bg-surface">
                    <div className="border-b border-border p-5">
                      <h3 className="font-semibold text-text">Mapped sample</h3>
                      <p className="mt-1 text-[13px] text-muted">
                        How the importer reads the first substantive rows before commit.
                      </p>
                    </div>
                    <div className="divide-y divide-border">
                      {preview.sampleMappedRows.map((row) => (
                        <div key={row.rowIndex} className="p-4 text-[13px] text-text">
                          <p className="font-medium">{row.name}</p>
                          <p className="mt-1 text-[12px] text-muted">
                            {[row.primaryEmail ?? "No email", row.type, row.score]
                              .filter(Boolean)
                              .join(" • ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>
                ) : null}
              </section>

              <aside className="space-y-4">
                <article className="rounded-modal border border-border bg-surface p-5">
                  <ShieldCheck className="h-5 w-5 text-success" aria-hidden />
                  <h3 className="mt-4 font-semibold text-text">Import behavior</h3>
                  <p className="mt-2 text-[13px] text-muted">
                    Imports use the same safeguards as manual contact creation—including
                    timeline events once committed.
                  </p>
                </article>

                <article className="rounded-modal border border-border bg-surface p-5">
                  <h3 className="font-semibold text-text">Summary</h3>
                  <div className="mt-4 space-y-3">
                    <SummaryRow
                      label="Rows"
                      value={parseResult ? String(parseResult.totalDataRows) : "—"}
                    />
                    <SummaryRow
                      label="Import cap"
                      value={parseResult ? String(parseResult.cappedRows) : "—"}
                    />
                    <SummaryRow
                      label="Mapped fields"
                      value={String(mappedFieldCount)}
                    />
                    <SummaryRow
                      label="Duplicate candidates"
                      value={preview ? String(preview.duplicates.length) : "—"}
                    />
                    <SummaryRow
                      label="Rows missing name"
                      value={
                        preview
                          ? String(preview.unmappedMandatoryNameRows)
                          : parseResult
                            ? "—"
                            : "Preview first"
                      }
                    />
                  </div>
                </article>
              </aside>
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}

function StepCard({
  icon: Icon,
  title,
  detail,
  done,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  done?: boolean;
}) {
  return (
    <div
      className={`flex gap-3 rounded-card border p-3 ${
        done ? "border-accent/35 bg-accent/10" : "border-border bg-bg"
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
      <div>
        <p className="text-[13px] font-medium text-text">{title}</p>
        <p className="mt-1 text-[12px] text-muted">{detail}</p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[12px] text-muted">{label}</span>
      <span className="text-[13px] font-semibold text-text">{value}</span>
    </div>
  );
}
