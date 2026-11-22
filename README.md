# Voice It

Listen to your books read aloud. Upload a PDF or text file, choose a woman's or a man's voice,
and press Stop whenever you like — Voice It remembers the sentence you stopped on and picks the
book back up there, even after you close the page.

## How it works

- **Upload** a PDF, `.txt`, or `.md` file. The text is split into sentences so the reader can
  follow along and jump around.
- **Choose a voice.** Every browser ships its own set of speech voices, so the exact sound
  differs a little between phones and computers.
- **Stop and resume.** Your place is saved per book, on the device you used. Books do not
  follow you to another phone or computer.
- **Jump anywhere.** Click any sentence to start reading from there.

Built on the browser's built-in speech engine — no audio files are generated or stored.

## Development

You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd voice-it
npm i
npm run dev
```

Then open the URL the dev server prints (usually http://localhost:8080).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run preview` — serve the built app
- `npm run test` — run the test suite
- `npm run lint` / `npm run format` — code style

## Built with

- TanStack Start (React 19, Vite)
- TypeScript
- Tailwind CSS v4
- Web Speech API for the reading voice
- `pdfjs-dist` for reading PDFs, `idb-keyval` for saving books and progress
