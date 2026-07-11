import Link from "next/link";

export default function LegalPageShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-[#1a2b4c]">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{title}</span>
      </nav>

      <article className="rounded-xl bg-white p-6 shadow-sm md:p-10">
        <h1 className="text-3xl font-bold text-[#1a2b4c]">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {updated}</p>
        <div className="prose prose-sm mt-8 max-w-none text-gray-700 prose-headings:text-[#1a2b4c] prose-a:text-[#c41e20]">
          {children}
        </div>
      </article>

      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/privacy-policy" className="text-[#1a2b4c] underline">
          Privacy Policy
        </Link>
        <Link href="/terms" className="text-[#1a2b4c] underline">
          Terms of Service
        </Link>
        <Link href="/user-data-deletion" className="text-[#1a2b4c] underline">
          User Data Deletion
        </Link>
      </div>
    </div>
  );
}
