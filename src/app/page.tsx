import { SITE_NAME } from "@/lib/site";

/** Placeholder until the dashboard arrives in M3. */
export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold">{SITE_NAME}</h1>
      <p className="mt-2">Under construction.</p>
    </main>
  );
}
