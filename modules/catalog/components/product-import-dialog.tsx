"use client";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/client/http";
import { money } from "@/lib/format";
import type {
  ProductImportPreviewDTO,
  ProductImportResultDTO,
} from "@/modules/catalog/contracts/import";

function downloadErrors(preview: ProductImportPreviewDTO) {
  const lines = [
    ["Linha", "Nome", "Erros"],
    ...preview.rows
      .filter((row) => row.errors.length)
      .map((row) => [String(row.row), row.values.name, row.errors.join(" | ")]),
  ];
  const csv = lines
    .map((line) => line.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");

  link.href = url;
  link.download = "erros-importacao-produtos.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function ProductImportDialog({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const requestId = useRef(crypto.randomUUID());
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ProductImportPreviewDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function readFile(file?: File) {
    if (!file) return;

    setBusy(true);
    setError("");
    setPreview(null);

    try {
      const body = new FormData();

      body.append("file", file);
      setPreview(
        await api<ProductImportPreviewDTO>("/api/admin/products/import/preview", {
          method: "POST",
          body,
        })
      );
      requestId.current = crypto.randomUUID();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível ler a planilha.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!preview?.validCount) return;

    setBusy(true);
    setError("");

    try {
      const result = await api<ProductImportResultDTO>("/api/admin/products/import/confirm", {
        method: "POST",
        headers: { "Idempotency-Key": requestId.current },
        body: JSON.stringify({
          rows: preview.rows.flatMap((row) => (row.product ? [row.product] : [])),
        }),
      });

      toast.success(
        result.alreadyImported
          ? "Esta planilha já havia sido importada."
          : `${result.importedCount} produto(s) importado(s) como rascunho.`
      );
      setOpen(false);
      setPreview(null);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível importar os produtos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (busy) return;

        setOpen(value);

        if (!value) {
          setPreview(null);
          setError("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={!enabled}
          title={!enabled ? "Disponível nos planos pagos" : undefined}
        >
          <FileSpreadsheet size={17} />
          Importar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar produtos por Excel</DialogTitle>
          <DialogDescription>
            Use o modelo oficial. Os produtos válidos serão criados como rascunho, sem imagens ou
            variações.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" asChild>
            <a href="/api/admin/products/import/template">
              <Download size={16} />
              Baixar modelo
            </a>
          </Button>
          <Input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="max-w-sm"
            disabled={busy}
            aria-label="Selecionar planilha de produtos"
            onChange={(event) => {
              void readFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {busy && <Loader2 className="animate-spin text-muted-foreground" size={18} />}
        </div>
        {error && (
          <p className="field-error rounded-lg bg-destructive/5 p-3" role="alert">
            {error}
          </p>
        )}
        {preview && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 size={13} />
                {preview.validCount} válidos
              </Badge>
              {preview.invalidCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle size={13} />
                  {preview.invalidCount} com erros
                </Badge>
              )}
            </div>
            <div className="max-h-80 overflow-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="p-3">Linha</th>
                    <th className="p-3">Produto</th>
                    <th className="p-3">Preço</th>
                    <th className="p-3">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.row} className="border-t align-top">
                      <td className="p-3">{row.row}</td>
                      <td className="p-3">
                        <strong>{row.values.name || "Sem nome"}</strong>
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {row.values.categoryName || "Sem categoria"}
                        </span>
                      </td>
                      <td className="p-3">
                        {row.product ? money(row.product.priceCents) : row.values.price || "—"}
                      </td>
                      <td className="p-3">
                        {row.errors.length ? (
                          <ul className="text-xs text-destructive">
                            {row.errors.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-xs text-emerald-700">Pronto para importar</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {preview.invalidCount > 0 && (
                <Button variant="outline" onClick={() => downloadErrors(preview)}>
                  <Download size={16} />
                  Baixar relatório de erros
                </Button>
              )}
              <Button disabled={busy || preview.validCount === 0} onClick={() => void confirm()}>
                {busy && <Loader2 className="animate-spin" size={16} />}Importar{" "}
                {preview.validCount} produto(s)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
