import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { readHindiDoc, listHindiDocs } from "@/lib/docs/read-hindi-doc";
import { renderSimpleMarkdown } from "@/lib/docs/render-markdown";

type Props = { params: Promise<{ path: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await params;
  const filename = path.join("/");
  const doc = readHindiDoc(filename);
  if (!doc) return { title: "Documentation" };
  return {
    title: `${doc.title} | News Junction Docs`,
    robots: { index: false, follow: false },
  };
}

export default async function HindiDocPage({ params }: Props) {
  const { path } = await params;
  const filename = path.join("/");
  const doc = readHindiDoc(filename);
  if (!doc) notFound();

  const html = renderSimpleMarkdown(doc.content);
  const allDocs = listHindiDocs();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <Link href="/" className="text-sm text-gray-500 hover:text-[#c41e20]">
              ← News Junction
            </Link>
            <h1 className="mt-1 text-lg font-bold text-[#1a2b4c]">{doc.title}</h1>
          </div>
          <Link
            href="/admin/system-verification"
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            System Verification
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Hindi guides</p>
          <nav className="space-y-1 text-sm">
            {allDocs.map((name) => (
              <Link
                key={name}
                href={`/docs/hindi/${name}`}
                className={`block rounded px-2 py-1 hover:bg-white ${
                  name === filename.split("/").pop() ? "bg-white font-medium text-[#c41e20]" : "text-gray-600"
                }`}
              >
                {name.replace(/\.md$/, "")}
              </Link>
            ))}
          </nav>
        </aside>

        <article
          className="rounded-xl bg-white p-6 shadow-sm prose-doc"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
