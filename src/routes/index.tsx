import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { type Book, deleteBook, extractText, listBooks, pickVoice, saveBook, splitText } from "@/lib/reader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Voice It — Listen to your books" },
      { name: "description", content: "Upload a book and have it read aloud in a woman's or man's voice. Pause anytime and pick up right where you left off." },
      { property: "og:title", content: "Voice It — Listen to your books" },
      { property: "og:description", content: "Upload a book, choose a voice, and resume where you left off." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [books, setBooks] = useState<Book[]>([]);
  const [book, setBook] = useState<Book | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const bookRef = useRef<Book | null>(null);
  const playingRef = useRef(false);
  const activeRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    listBooks().then(setBooks);
    const load = () => setVoices(speechSynthesis.getVoices());
    load();
    speechSynthesis.onvoiceschanged = load;
    return () => speechSynthesis.cancel();
  }, []);
  useEffect(() => { activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); }, [book?.position]);

  const update = (b: Book) => { bookRef.current = b; setBook(b); saveBook(b); };

  const speakFrom = (idx: number) => {
    const b = bookRef.current;
    if (!b || idx >= b.chunks.length) { stop(); return; }
    update({ ...b, position: idx });
    const u = new SpeechSynthesisUtterance(b.chunks[idx]);
    const v = pickVoice(voices.length ? voices : speechSynthesis.getVoices(), b.voice);
    if (v) u.voice = v;
    u.pitch = b.voice === "female" ? 1.15 : 0.85;
    u.onend = () => { if (playingRef.current) speakFrom(idx + 1); };
    speechSynthesis.speak(u);
  };
  const play = () => { speechSynthesis.cancel(); playingRef.current = true; setPlaying(true); speakFrom(bookRef.current!.position); };
  function stop() { playingRef.current = false; setPlaying(false); speechSynthesis.cancel(); }

  const open = (b: Book) => { stop(); bookRef.current = b; setBook(b); };
  const close = () => { stop(); setBook(null); listBooks().then(setBooks); };
  const setVoice = (g: "female" | "male") => { const was = playingRef.current; stop(); update({ ...bookRef.current!, voice: g }); if (was) setTimeout(play, 50); };
  const jump = (i: number) => { const was = playingRef.current; stop(); update({ ...bookRef.current!, position: i }); if (was) setTimeout(play, 50); };

  const upload = async (f?: File) => {
    if (!f) return;
    setLoading(true);
    try {
      const chunks = splitText(await extractText(f));
      if (!chunks.length) throw new Error("No readable text found in this file.");
      const b: Book = { id: crypto.randomUUID(), title: f.name.replace(/\.[^.]+$/, ""), chunks, position: 0, voice: "female", updatedAt: Date.now() };
      await saveBook(b);
      open(b);
    } catch (e) { alert((e as Error).message); }
    setLoading(false);
  };

  if (book) {
    const pct = Math.round((book.position / book.chunks.length) * 100);
    return (
      <main className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-5 py-4">
            <button onClick={close} className="text-sm text-muted-foreground hover:text-foreground">← Library</button>
            <h1 className="font-display flex-1 truncate text-xl">{book.title}</h1>
            <div className="flex rounded-full border border-border p-1 text-sm">
              {(["female", "male"] as const).map((g) => (
                <button key={g} onClick={() => setVoice(g)} className={`rounded-full px-3 py-1 ${book.voice === g ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  {g === "female" ? "Woman" : "Man"}
                </button>
              ))}
            </div>
            <button onClick={playing ? stop : play} className="rounded-full bg-accent px-6 py-2 font-medium text-accent-foreground shadow-warm">
              {playing ? "❚❚ Stop" : book.position > 0 ? "▶ Continue" : "▶ Read aloud"}
            </button>
          </div>
          <div className="h-1 bg-muted"><div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} /></div>
        </header>
        <article className="font-display mx-auto max-w-3xl px-5 py-10 text-lg leading-relaxed">
          {book.chunks.map((c, i) => (
            <p key={i} ref={i === book.position ? activeRef : undefined} onClick={() => jump(i)}
              className={`cursor-pointer rounded px-2 py-1 transition-colors ${i === book.position ? "bg-highlight text-foreground" : i < book.position ? "text-muted-foreground" : "hover:bg-muted"}`}>
              {c}
            </p>
          ))}
        </article>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-3xl px-5 py-20 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">Voice It</p>
        <h1 className="font-display mt-4 text-5xl leading-tight md:text-6xl">Your books, read aloud.</h1>
        <p className="mt-4 text-muted-foreground">Upload a book, choose a woman's or man's voice, and stop anytime — we'll remember your place.</p>
        <label className="mt-10 block cursor-pointer rounded-2xl border-2 border-dashed border-border bg-card p-10 transition hover:border-accent">
          <input type="file" accept=".txt,.pdf,.md" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <span className="font-display text-2xl">{loading ? "Opening your book…" : "Upload a book"}</span>
          <span className="mt-2 block text-sm text-muted-foreground">PDF or text file</span>
        </label>
      </section>
      {books.length > 0 && (
        <section className="mx-auto max-w-3xl px-5 pb-20">
          <h2 className="font-display mb-4 text-2xl">Your library</h2>
          <ul className="space-y-3">
            {books.map((b) => (
              <li key={b.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <button onClick={() => open(b)} className="flex-1 text-left">
                  <div className="font-display text-lg">{b.title}</div>
                  <div className="text-sm text-muted-foreground">{Math.round((b.position / b.chunks.length) * 100)}% read · {b.voice === "female" ? "Woman" : "Man"}'s voice</div>
                </button>
                <button onClick={() => open(b)} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">{b.position > 0 ? "Continue" : "Start"}</button>
                <button onClick={async () => { await deleteBook(b.id); setBooks(await listBooks()); }} className="text-sm text-muted-foreground hover:text-destructive">Remove</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
