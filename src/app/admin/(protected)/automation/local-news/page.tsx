"use client";

import Link from "next/link";

export default function LocalNewsAutomationPage() {
  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-bold">Local News Automation</h1>
      <p className="text-gray-600">
        India-first quotas: 95% India target, max 5% international auto-publish per day.
        International articles defer to approval queue when quota is full.
      </p>
      <ul className="list-disc space-y-2 pl-6 text-sm">
        <li>Location detection runs on every automated publish (headline + summary rules).</li>
        <li>Source HQ does not override story location.</li>
        <li>geoConfidence &lt; 65: no district/city guess — broader scope used.</li>
        <li>Queues: national → state → district/city → international (within limit).</li>
      </ul>
      <Link href="/admin/locations" className="text-[#c41e20] hover:underline">
        → Location dashboard & backfill
      </Link>
      <Link href="/admin/analytics/location-coverage" className="ml-4 text-[#c41e20] hover:underline">
        → Coverage analytics
      </Link>
    </div>
  );
}
