import { useEffect, useState } from "react";

interface DownloadManagerProps {
  orderId: string;
  onClose: () => void;
}

interface DownloadFile {
  name: string;
  signedUrl: string;
  type: string;
}

export function DownloadManager({ orderId, onClose }: DownloadManagerProps) {
  const [files, setFiles] = useState<DownloadFile[]>([]);
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch from Netlify Function
    fetch(`/.netlify/functions/get-download?orderId=${orderId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setFiles(data.files || []);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  const downloadFile = async (url: string, filename: string) => {
    if (!url) return;
    setDownloading((prev) => ({ ...prev, [filename]: true }));
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      alert(`Failed to download ${filename}`);
    } finally {
      setDownloading((prev) => ({ ...prev, [filename]: false }));
    }
  };

  const downloadAll = () => {
    // Trigger sequential downloads since we are not zipping
    files.forEach((file, index) => {
      setTimeout(() => {
        downloadFile(file.signedUrl, file.name);
      }, index * 1000); // Stagger downloads by 1 second to prevent browser blocking
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] text-white w-full max-w-2xl rounded-xl p-6 shadow-2xl border border-gray-800">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <span className="text-3xl">🎵</span> Your Audio is Ready
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-5 mb-6">
          <div className="flex items-start gap-4">
            <span className="text-amber-500 text-2xl mt-0.5">⚠️</span>
            <div>
              <p className="font-semibold text-amber-400 mb-2">File Organization Notice</p>
              <p className="text-sm text-gray-300 leading-relaxed">
                To maximize quality and save bandwidth, these files are delivered directly <strong>without compression</strong>. 
                They will download directly to your browser's default folder (usually <strong>Downloads</strong>). 
                To avoid losing track of your purchase, we recommend creating a dedicated folder 
                (e.g., <code className="bg-black/50 px-1.5 py-0.5 rounded text-amber-200">My_Soundpacks</code>) 
                before downloading.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-emerald-500 animate-pulse">
            Generating secure links...
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-400 bg-red-950/30 rounded-lg border border-red-900/50">
            {error}
          </div>
        ) : (
          <>
            {/* File List */}
            <div className="space-y-3 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {files.map((file) => (
                <div key={file.name} className="flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors rounded-lg p-4 border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-900/30 flex items-center justify-center text-emerald-400">
                      🎧
                    </div>
                    <div>
                      <p className="font-medium text-gray-100">{file.name}</p>
                      <p className="text-xs text-emerald-500/70 font-mono mt-0.5">Premium Audio</p>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadFile(file.signedUrl, file.name)}
                    disabled={downloading[file.name] || !file.signedUrl}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
                  >
                    {downloading[file.name] ? "Downloading..." : "Download"}
                  </button>
                </div>
              ))}
            </div>

            {/* Download All Sequential */}
            {files.length > 1 && (
              <button
                onClick={downloadAll}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl font-bold text-lg hover:from-emerald-500 hover:to-teal-500 transition-all shadow-xl shadow-emerald-900/30 flex items-center justify-center gap-2"
              >
                <span>⬇️</span> Download All Files
              </button>
            )}

            <p className="text-center text-xs text-gray-500 mt-6 bg-black/30 py-2 rounded-lg">
              Links expire in 1 hour for your security.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
