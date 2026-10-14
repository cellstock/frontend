"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Download, ExternalLink, X } from "lucide-react";

export type OrderDocument = {
  title: string;
  source: Blob | string;
  filename?: string;
};

export function OrderDocumentPreview({
  document,
  onClose,
}: {
  document: OrderDocument;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const link = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const url =
      typeof document.source === "string"
        ? document.source
        : URL.createObjectURL(document.source);
    if (frame.current) frame.current.src = url;
    if (link.current) link.current.href = url;
    dialog.current?.showModal();
    const previous = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    return () => {
      window.document.body.style.overflow = previous;
      if (typeof document.source !== "string") URL.revokeObjectURL(url);
    };
  }, [document]);
  return createPortal(
    <dialog
      ref={dialog}
      onCancel={onClose}
      className="m-auto h-[92dvh] w-[min(1100px,96vw)] max-w-none overflow-hidden rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60"
      aria-label={document.title}
    >
      <div className="flex h-full flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="font-bold">{document.title}</h2>
            <p className="text-xs text-slate-500">
              Use the PDF toolbar to print or download. If the preview is
              unavailable, open the document in a new tab.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              ref={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
            >
              <ExternalLink className="h-4 w-4" />
              Open document
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close document preview"
              className="rounded-lg p-2 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>
        <iframe
          ref={frame}
          title={document.title}
          className="min-h-0 flex-1 bg-slate-800"
        />
        <footer className="flex items-center gap-2 border-t border-slate-200 p-3 text-xs text-slate-500">
          <Download className="h-4 w-4" />
          {document.filename ?? document.title}
        </footer>
      </div>
    </dialog>,
    window.document.body,
  );
}
