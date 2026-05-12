import { prisma } from "@/lib/prisma";

function html(message: string): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Unsubscribed</title></head><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;"><div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;"><h1 style="font-size:20px;margin:0 0 12px;">LogiVisa Alerts</h1><p style="font-size:15px;line-height:1.6;color:#334155;">${message}</p></div></body></html>`,
    {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    }
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();
  const id = searchParams.get("id")?.trim();

  if (!email || !id) {
    return html("Invalid unsubscribe request.");
  }

  try {
    const alert = await prisma.pointsAlert.findFirst({
      where: { id, email },
    });

    if (!alert) {
      return html("This alert was already removed or could not be found.");
    }

    await prisma.pointsAlert.update({
      where: { id: alert.id },
      data: { isActive: false },
    });

    return html("You've been unsubscribed successfully.");
  } catch (error) {
    console.error("[Points Alerts] Unsubscribe failed", error);
    return html("We could not process your unsubscribe request right now. Please try again later.");
  }
}
