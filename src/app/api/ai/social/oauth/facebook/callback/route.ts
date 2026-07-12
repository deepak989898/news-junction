import { NextRequest, NextResponse } from "next/server";
import { parseOAuthState, getSiteUrl } from "@/lib/ai-social/oauth-state";
import { completeFacebookOAuth } from "@/lib/ai-social/oauth-providers";

export const runtime = "nodejs";

function redirectToAccounts(params: Record<string, string>) {
  const url = new URL(`${getSiteUrl()}/admin/social/accounts`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return NextResponse.redirect(url.toString());
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (error) {
    return redirectToAccounts({
      status: "error",
      platform: "facebook",
      message: errorDescription || error,
    });
  }

  if (!code || !state) {
    return redirectToAccounts({
      status: "error",
      platform: "facebook",
      message: "Missing OAuth code or state",
    });
  }

  try {
    parseOAuthState(state);
    const result = await completeFacebookOAuth(code);
    const hint =
      result.configuredPageId && !result.matchedConfiguredId
        ? ` Connected Page ID ${result.pageId} (update FACEBOOK_PAGE_ID in Vercel if needed).`
        : "";
    return redirectToAccounts({
      status: "success",
      platform: "facebook",
      message: `Connected Facebook Page: ${result.pageName} (${result.pageId}).${hint}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Facebook connect failed";
    return redirectToAccounts({ status: "error", platform: "facebook", message });
  }
}
