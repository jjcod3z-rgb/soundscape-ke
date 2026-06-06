import { useEffect, useState, useCallback } from "react";

interface ReceiptData {
  orderId: string;
  productName: string;
  amountKes: number;
  customerEmail: string;
  purchaseDate: string;
  fileCount: number;
}

interface DownloadFile {
  name: string;
  signedUrl: string;
  type: string;
  error?: string;
}

interface DownloadManagerProps {
  orderId: string;
  onClose: () => void;
}

export function DownloadManager({ orderId, onClose }: DownloadManagerProps) {
  const [files, setFiles] = useState<DownloadFile[]>([]);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    fetch(`/.netlify/functions/get-download?orderId=${orderId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setFiles(data.files || []);
          setReceipt(data.receipt || null);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  const downloadFile = useCallback(async (url: string, filename: string) => {
    if (!url) return;
    setDownloading((prev) => ({ ...prev, [filename]: true }));
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      alert(`Failed to download ${filename}. Please try again.`);
    } finally {
      setDownloading((prev) => ({ ...prev, [filename]: false }));
    }
  }, []);

  const downloadReceipt = useCallback(() => {
    const a = document.createElement("a");
    a.href = `/.netlify/functions/download-receipt?orderId=${orderId}`;
    a.download = `receipt-${orderId.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [orderId]);

  const downloadAll = useCallback(async () => {
    setDownloadingAll(true);
    // 1. Download receipt first
    downloadReceipt();
    await new Promise((r) => setTimeout(r, 800));
    // 2. Then stagger all audio files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.signedUrl) {
        await downloadFile(file.signedUrl, file.name);
        if (i < files.length - 1) await new Promise((r) => setTimeout(r, 1000));
      }
    }
    setDownloadingAll(false);
    setAllDone(true);
  }, [files, downloadFile, downloadReceipt]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-KE", {
        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="relative bg-[#0f0f0f] text-white w-full max-w-2xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-emerald-950/40">
          <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
            <span>🎵</span> Download Centre
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {loading ? (
            <div className="py-20 text-center text-emerald-400 animate-pulse text-lg">
              Generating secure download links…
            </div>
          ) : error ? (
            <div className="py-10 text-center text-red-400 bg-red-950/30 rounded-xl border border-red-900/50 px-6">
              <p className="text-2xl mb-2">⚠️</p>
              <p className="font-semibold">Could not load your downloads</p>
              <p className="text-sm text-gray-400 mt-1">{error}</p>
            </div>
          ) : (
            <>
              {/* Receipt Card */}
              {receipt && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-widest">
                    <span>🧾</span> Purchase Receipt
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div className="text-gray-400">Product</div>
                    <div className="text-white font-medium">{receipt.productName}</div>
                    <div className="text-gray-400">Amount Paid</div>
                    <div className="text-emerald-400 font-bold font-mono">KES {receipt.amountKes.toLocaleString()}</div>
                    <div className="text-gray-400">Email</div>
                    <div className="text-white truncate">{receipt.customerEmail}</div>
                    <div className="text-gray-400">Date</div>
                    <div className="text-white">{formatDate(receipt.purchaseDate)}</div>
                    <div className="text-gray-400">Order Ref</div>
                    <div className="text-white font-mono text-xs break-all">{receipt.orderId}</div>
                  </div>
                  <button
                    onClick={downloadReceipt}
                    className="mt-2 w-full text-sm py-2.5 rounded-lg border border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>📄</span> Download Receipt (.txt)
                  </button>
                </div>
              )}

              {/* Piracy Warning */}
              <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl p-4 flex gap-3">
                <span className="text-amber-500 text-xl shrink-0 mt-0.5">⚠️</span>
                <div className="text-xs leading-relaxed text-amber-200/80">
                  <p className="font-bold text-amber-400 mb-1">Anti-Piracy Notice</p>
                  This purchase is licensed for your personal and commercial use only. Sharing, redistributing, or reselling these files or download links is strictly prohibited and constitutes copyright infringement. <span className="text-amber-400 font-semibold">Misuse will result in permanent link revocation.</span>
                </div>
              </div>

              {/* Re-download Instructions */}
              <div className="bg-blue-950/30 border border-blue-700/40 rounded-xl p-4 flex gap-3">
                <span className="text-blue-400 text-xl shrink-0 mt-0.5">🔖</span>
                <div className="text-xs leading-relaxed text-blue-200/80">
                  <p className="font-bold text-blue-400 mb-1">Save this for later</p>
                  Bookmark this page or save your <span className="font-mono text-white">Order Reference ID</span>. You can re-download your files at any time at{" "}
                  <a href="/redownload" className="text-blue-400 underline hover:text-blue-300">
                    the-sound-scape.netlify.app/redownload
                  </a>{" "}
                  using your email and order reference.
                </div>
              </div>

              {/* Files */}
              <div>
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>🎧</span> Audio Files ({files.length})
                </h3>
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between bg-white/5 hover:bg-white/8 transition-colors rounded-lg px-4 py-3 border border-white/5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-900/40 flex items-center justify-center text-emerald-400 shrink-0 text-sm">
                          ♫
                        </div>
                        <p className="text-sm font-medium text-gray-100 truncate">{file.name}</p>
                      </div>
                      <button
                        onClick={() => downloadFile(file.signedUrl, file.name)}
                        disabled={downloading[file.name] || !file.signedUrl || !!file.error}
                        className="ml-3 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      >
                        {downloading[file.name] ? "…" : file.error ? "Unavailable" : "Download"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* All Done state */}
              {allDone && (
                <div className="bg-emerald-950/40 border border-emerald-700/40 rounded-xl p-4 text-center text-emerald-400 font-semibold text-sm">
                  ✅ All files downloaded! Check your downloads folder.
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky CTA footer */}
        {!loading && !error && (
          <div className="px-6 py-4 border-t border-white/10 bg-black/50">
            <button
              onClick={downloadAll}
              disabled={downloadingAll}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl font-bold text-base transition-all shadow-xl shadow-emerald-900/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {downloadingAll ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Downloading…
                </>
              ) : (
                <>
                  <span>⬇️</span>
                  Download Everything ({files.length} file{files.length !== 1 ? "s" : ""} + Receipt)
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-500 mt-2">
              Links are active for 7 days · Re-download anytime via <a href="/redownload" className="text-gray-400 hover:text-white underline">/redownload</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
