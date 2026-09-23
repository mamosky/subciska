import { Player } from "@/components/player";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-10 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col gap-8">
        <header className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Subciska
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Hear an ayah, pause to recall the next, then continue.
          </p>
        </header>

        <Player />

        <footer className="text-center text-xs text-zinc-400 dark:text-zinc-600">
          Your last position is saved automatically.
        </footer>
      </main>
    </div>
  );
}
