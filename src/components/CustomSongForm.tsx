import { useState } from "react";

export function CustomSongForm() {
  const [genre, setGenre] = useState("");
  const [duration, setDuration] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [indemnity, setIndemnity] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!indemnity) return;
    
    setBusy(true);
    try {
      const res = await fetch("/.netlify/functions/submit-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre, duration, lyrics }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Submission failed");
      alert("Brief submitted successfully! We will contact you via WhatsApp shortly.");
      setGenre("");
      setDuration("");
      setLyrics("");
      setIndemnity(false);
    } catch (err: unknown) {
      alert("Failed to submit brief: " + (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl p-8 border border-gray-800 shadow-2xl">
      <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-white mb-2">Commission Your Track</h3>
          <p className="text-gray-400">Custom compositions tailored exactly to your vision.</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Genre / Vibe</label>
            <input 
              required
              value={genre}
              onChange={e => setGenre(e.target.value)}
              placeholder="e.g., Afrobeat, melancholic orchestral..." 
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Expected Duration</label>
            <input 
              required
              value={duration}
              onChange={e => setDuration(e.target.value)}
              placeholder="e.g., 3 minutes loop" 
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Lyrics / Additional Notes</label>
            <textarea 
              value={lyrics}
              onChange={e => setLyrics(e.target.value)}
              placeholder="Optional vocal guidelines or specific instrumentation..." 
              className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition h-32 resize-none custom-scrollbar" 
            />
          </div>
        </div>
        
        <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-5 mt-6">
          <label className="flex items-start gap-4 cursor-pointer group">
            <div className="relative flex items-center justify-center mt-0.5">
              <input 
                type="checkbox" 
                checked={indemnity} 
                onChange={e => setIndemnity(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 text-emerald-600 focus:ring-emerald-600 bg-gray-800 cursor-pointer"
              />
            </div>
            <div className="text-sm text-gray-300">
              <span className="text-red-400 font-bold block mb-1.5 group-hover:text-red-300 transition-colors">Copyright Indemnity Agreement</span>
              <p className="leading-relaxed">
                I understand that providing reference tracks (e.g., "like Burna Boy's song") may lead to 
                copyright claims from rights holders if the generated instrumental is deemed substantially 
                similar. I agree to indemnify and hold harmless the producer from any legal claims arising 
                from my reference selection. I maintain 100% ownership of the final delivered instrumental's IP.
              </p>
            </div>
          </label>
        </div>
        
        <button 
          type="submit"
          disabled={!indemnity || busy}
          className="w-full py-4 mt-8 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-emerald-600 shadow-lg shadow-emerald-900/20"
        >
          {busy ? "Submitting..." : "Submit Brief (KSh 5,000–12,000)"}
        </button>
        
        <p className="text-center text-sm text-gray-500 mt-4 flex items-center justify-center gap-2">
          <span>📱</span> After submission, you will receive a quote via WhatsApp within 6 hours.
        </p>
      </form>
    </div>
  );
}
