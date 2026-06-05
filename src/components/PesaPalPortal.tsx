import { useEffect, useRef } from "react";

interface PesaPalPortalProps {
  pesapalUrl: string;
  orderId: string;
  onSuccess: (orderId: string, downloadToken: string) => void;
  onClose: () => void;
}

export function PesaPalPortal({ pesapalUrl, orderId, onSuccess, onClose }: PesaPalPortalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // 1. Listen for postMessage from the iframe redirection (if it happens)
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "PAYMENT_SUCCESS") {
        onSuccess(e.data.orderId, e.data.downloadToken);
      }
      if (e.data?.type === "PAYMENT_FAILED") {
        alert("Payment failed. Please try again.");
        onClose();
      }
    };
    window.addEventListener("message", handler);

    // 2. Fallback Polling: check order status every 3 seconds in case the iframe doesn't redirect
    const interval = setInterval(async () => {
      if (!orderId) return;
      try {
        const res = await fetch("/.netlify/functions/check-order-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json();
        if (data.success && data.status === "paid" && data.downloadToken) {
          clearInterval(interval);
          onSuccess(orderId, data.downloadToken);
        }
      } catch (err) {
        console.error("Error polling order status:", err);
      }
    }, 3000);

    return () => {
      window.removeEventListener("message", handler);
      clearInterval(interval);
    };
  }, [onSuccess, onClose, orderId]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="relative w-full max-w-[800px] h-[600px] bg-white rounded-lg overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-12 bg-[#1a1a1a] flex items-center px-4 justify-between z-10">
          <span className="text-white font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Secure Checkout
          </span>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors"
            title="Cancel Checkout"
          >
            ✕
          </button>
        </div>
        <div className="w-full h-full pt-12 bg-gray-50 flex items-center justify-center">
          {pesapalUrl ? (
            <iframe
              ref={iframeRef}
              src={pesapalUrl}
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title="PesaPal Checkout"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-500">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p>Connecting to PesaPal...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
