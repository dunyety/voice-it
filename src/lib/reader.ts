import { get, set, del, keys } from "idb-keyval";

export type Book = { id: string; title: string; chunks: string[]; position: number; voice: "female" | "male"; updatedAt: number };

export function splitText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  const parts = clean.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? [];
  const out: string[] = [];
  let buf = "";
  for (const p of parts) {
    if ((buf + p).length > 240 && buf) { out.push(buf.trim()); buf = ""; }
    buf += p + " ";
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export async function extractText(file: File): Promise<string> {
  if (file.name.toLowerCase().endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const c = await page.getTextContent();
      text += c.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n";
    }
    return text;
  }
  return file.text();
}

export const saveBook = (b: Book) => set(`book:${b.id}`, { ...b, updatedAt: Date.now() });
export const deleteBook = (id: string) => del(`book:${id}`);
export async function listBooks(): Promise<Book[]> {
  const ks = (await keys()).filter((k) => String(k).startsWith("book:"));
  const books = await Promise.all(ks.map((k) => get<Book>(k)));
  return (books.filter(Boolean) as Book[]).sort((a, b) => b.updatedAt - a.updatedAt);
}

const FEMALE = /female|woman|samantha|victoria|karen|moira|tessa|fiona|zira|susan|hazel|serena|allison|ava|kate|libby|sonia|jenny|aria|emma|google uk english female|google us english/i;
const MALE = /\bmale|\bman\b|daniel|alex|fred|david|mark|george|james|ryan|guy|rishi|thomas|oliver|arthur|aaron|google uk english male/i;

export function pickVoice(voices: SpeechSynthesisVoice[], g: "female" | "male") {
  const en = voices.filter((v) => v.lang.startsWith("en"));
  const pool = en.length ? en : voices;
  const re = g === "female" ? FEMALE : MALE;
  const other = g === "female" ? MALE : FEMALE;
  return pool.find((v) => re.test(v.name) && !(g === "female" && /\bmale/i.test(v.name) && !/female/i.test(v.name))) ?? pool.find((v) => !other.test(v.name)) ?? pool[0];
}
