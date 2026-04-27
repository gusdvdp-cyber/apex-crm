import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── GET: verificación del webhook de Meta ──────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !challenge)
    return new NextResponse("Forbidden", { status: 403 });

  // El verify_token puede ser el slug o un token custom guardado en org_integrations
  const { data: org } = await admin
    .from("organizations").select("id").eq("slug", slug).single();
  if (!org) return new NextResponse("Not found", { status: 404 });

  // Aceptamos slug como verify_token (simple) o cualquier token de sus integraciones
  if (token !== slug) return new NextResponse("Forbidden", { status: 403 });

  return new NextResponse(challenge, { status: 200 });
}

// ── POST: mensajes entrantes de Meta ──────────────────────────
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";

  // Buscar org
  const { data: org } = await admin
    .from("organizations").select("id").eq("slug", slug).single();
  if (!org) return new NextResponse("Not found", { status: 404 });

  // Verificar firma si hay app_secret configurado
  const { data: waIntegration } = await admin
    .from("org_integrations").select("config")
    .eq("organization_id", org.id).eq("channel", "whatsapp").single();
  const { data: metaIntegration } = await admin
    .from("org_integrations").select("config")
    .eq("organization_id", org.id).eq("channel", "meta").single();

  const waSecret = waIntegration?.config?.app_secret;
  const metaSecret = metaIntegration?.config?.app_secret;

  let payload: Record<string, unknown>;
  try { payload = JSON.parse(rawBody); }
  catch { return new NextResponse("Bad request", { status: 400 }); }

  const object = payload.object as string;

  // ── WhatsApp ────────────────────────────────────────────────
  if (object === "whatsapp_business_account") {
    if (waSecret && signature) {
      const expected = "sha256=" + createHmac("sha256", waSecret).update(rawBody).digest("hex");
      if (signature !== expected) return new NextResponse("Invalid signature", { status: 403 });
    }

    const entries = (payload.entry as unknown[]) ?? [];
    for (const entry of entries) {
      const changes = ((entry as Record<string, unknown>).changes as unknown[]) ?? [];
      for (const change of changes) {
        const value = (change as Record<string, unknown>).value as Record<string, unknown>;

        // ── Status updates (sent / delivered / read) ──────────
        if (value?.statuses) {
          const statuses = (value.statuses as Record<string, unknown>[]) ?? [];
          for (const s of statuses) {
            const waMsgId = s.id as string;
            const status = s.status as string;
            if (waMsgId && (status === "sent" || status === "delivered" || status === "read")) {
              await admin.from("messages").update({ status }).eq("external_id", waMsgId);
            }
          }
        }

        if (!value?.messages) continue;

        const contacts = (value.contacts as Record<string, unknown>[]) ?? [];
        const messages = (value.messages as Record<string, unknown>[]) ?? [];

        for (const msg of messages) {
          if (msg.type !== "text" && msg.type !== "image" && msg.type !== "audio") continue;

          const phone = msg.from as string;
          const waMsgId = msg.id as string;
          const contactInfo = contacts.find(c => (c as Record<string, string>).wa_id === phone);
          const contactName = (contactInfo as Record<string, unknown>)?.profile
            ? ((contactInfo as Record<string, unknown>).profile as Record<string, string>).name
            : phone;

          await upsertWaMessage({
            orgId: org.id,
            phone,
            contactName,
            waMsgId,
            msg,
            accessToken: waIntegration?.config?.access_token ?? "",
          });
        }
      }
    }
    return NextResponse.json({ ok: true });
  }

  // ── Instagram ───────────────────────────────────────────────
  if (object === "instagram") {
    if (metaSecret && signature) {
      const expected = "sha256=" + createHmac("sha256", metaSecret).update(rawBody).digest("hex");
      if (signature !== expected) return new NextResponse("Invalid signature", { status: 403 });
    }

    const entries = (payload.entry as unknown[]) ?? [];
    for (const entry of entries) {
      const messaging = ((entry as Record<string, unknown>).messaging as unknown[]) ?? [];
      for (const event of messaging) {
        const e = event as Record<string, unknown>;
        if (!e.message) continue;
        const message = e.message as Record<string, unknown>;
        if (message.is_echo) continue;

        const senderId = (e.sender as Record<string, string>).id;
        const mid = message.mid as string;
        const text = (message.text as string) ?? "";

        await upsertSocialMessage({
          orgId: org.id,
          channel: "instagram",
          senderId,
          mid,
          text,
        });
      }
    }
    return NextResponse.json({ ok: true });
  }

  // ── Messenger ───────────────────────────────────────────────
  if (object === "page") {
    if (metaSecret && signature) {
      const expected = "sha256=" + createHmac("sha256", metaSecret).update(rawBody).digest("hex");
      if (signature !== expected) return new NextResponse("Invalid signature", { status: 403 });
    }

    const entries = (payload.entry as unknown[]) ?? [];
    for (const entry of entries) {
      const messaging = ((entry as Record<string, unknown>).messaging as unknown[]) ?? [];
      for (const event of messaging) {
        const e = event as Record<string, unknown>;
        if (!e.message) continue;
        const message = e.message as Record<string, unknown>;
        if (message.is_echo) continue;

        const senderId = (e.sender as Record<string, string>).id;
        const mid = message.mid as string;
        const text = (message.text as string) ?? "";

        await upsertSocialMessage({
          orgId: org.id,
          channel: "messenger",
          senderId,
          mid,
          text,
        });
      }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

// ── Helpers ───────────────────────────────────────────────────

async function fetchAndStoreMedia(mediaId: string, accessToken: string, orgId: string, msgId: string): Promise<{ url: string; type: string } | null> {
  try {
    // Get media URL from Meta
    const metaRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) return null;
    const metaData = await metaRes.json() as { url: string; mime_type: string };

    // Download the file
    const fileRes = await fetch(metaData.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!fileRes.ok) return null;

    const buffer = Buffer.from(await fileRes.arrayBuffer());
    const mimeType = metaData.mime_type ?? "application/octet-stream";
    const ext = mimeType.includes("jpeg") ? "jpg"
      : mimeType.includes("png") ? "png"
      : mimeType.includes("ogg") ? "ogg"
      : mimeType.includes("mpeg") ? "mp3"
      : mimeType.includes("mp4") ? "mp4"
      : "bin";

    const path = `whatsapp/${orgId}/${msgId}.${ext}`;
    const { error } = await admin.storage.from("media").upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    });
    if (error) { console.error("Storage upload error:", error.message); return null; }

    const { data: urlData } = admin.storage.from("media").getPublicUrl(path);
    const mediaType = mimeType.startsWith("image") ? "image" : "audio";
    return { url: urlData.publicUrl, type: mediaType };
  } catch (e) {
    console.error("fetchAndStoreMedia error:", e);
    return null;
  }
}

async function upsertWaMessage({ orgId, phone, contactName, waMsgId, msg, accessToken }: {
  orgId: string; phone: string; contactName: string;
  waMsgId: string; msg: Record<string, unknown>; accessToken: string;
}) {
  // Deduplication
  const { data: existing } = await admin
    .from("messages").select("id").eq("external_id", waMsgId).single();
  if (existing) return;

  // Find or create contact
  let contactId: string | null = null;
  const { data: contact } = await admin
    .from("contacts").select("id")
    .eq("organization_id", orgId).eq("phone", phone).single();

  if (contact) {
    contactId = contact.id;
  } else {
    const nameParts = contactName.split(" ");
    const { data: newContact } = await admin.from("contacts").insert({
      organization_id: orgId,
      name: nameParts[0] ?? phone,
      last_name: nameParts.slice(1).join(" ") || null,
      phone,
    }).select("id").single();
    contactId = newContact?.id ?? null;
  }

  // Find or create conversation
  const externalId = `wa_${phone}`;
  let convId: string;
  const { data: conv } = await admin
    .from("conversations").select("id")
    .eq("organization_id", orgId).eq("external_id", externalId).single();

  if (conv) {
    convId = conv.id;
  } else {
    const { data: newConv, error: convErr } = await admin.from("conversations").insert({
      organization_id: orgId,
      channel: "whatsapp",
      external_id: externalId,
      contact_id: contactId,
      last_message: "",
      unread_count: 0,
      is_online: false,
    }).select("id").single();
    if (convErr || !newConv) {
      console.error("Error creating conversation:", convErr?.message);
      return;
    }
    convId = newConv.id;
  }

  // Determine text and media
  let text = "";
  let mediaUrl: string | null = null;
  let mediaType: string | null = null;

  if (msg.type === "text") {
    text = ((msg.text as Record<string, string>)?.body) ?? "";
  } else if (msg.type === "image") {
    text = "[imagen]";
    const mediaId = (msg.image as Record<string, string>)?.id;
    if (mediaId && accessToken) {
      const stored = await fetchAndStoreMedia(mediaId, accessToken, orgId, waMsgId);
      if (stored) { mediaUrl = stored.url; mediaType = stored.type; }
      else mediaType = "image";
    } else { mediaType = "image"; }
  } else if (msg.type === "audio") {
    text = "[audio]";
    const mediaId = (msg.audio as Record<string, string>)?.id;
    if (mediaId && accessToken) {
      const stored = await fetchAndStoreMedia(mediaId, accessToken, orgId, waMsgId);
      if (stored) { mediaUrl = stored.url; mediaType = stored.type; }
      else mediaType = "audio";
    } else { mediaType = "audio"; }
  }

  await admin.from("messages").insert({
    conversation_id: convId,
    external_id: waMsgId,
    text,
    from_type: "contact",
    media_url: mediaUrl,
    media_type: mediaType,
  });

  await admin.from("conversations").update({
    last_message: text,
    updated_at: new Date().toISOString(),
    contact_id: contactId,
  }).eq("id", convId);

  // Increment unread
  const { data: convRow } = await admin.from("conversations").select("unread_count").eq("id", convId).single();
  await admin.from("conversations").update({ unread_count: (convRow?.unread_count ?? 0) + 1 }).eq("id", convId);
}

async function upsertSocialMessage({ orgId, channel, senderId, mid, text }: {
  orgId: string; channel: "instagram" | "messenger";
  senderId: string; mid: string; text: string;
}) {
  // Deduplication
  const { data: existing } = await admin
    .from("messages").select("id").eq("external_id", mid).single();
  if (existing) return;

  // Find or create contact
  let contactId: string | null = null;
  const { data: contact } = await admin
    .from("contacts").select("id")
    .eq("organization_id", orgId)
    .eq("phone", `${channel}_${senderId}`).single();

  if (contact) {
    contactId = contact.id;
  } else {
    const { data: newContact } = await admin.from("contacts").insert({
      organization_id: orgId,
      name: channel === "instagram" ? "Usuario Instagram" : "Usuario Messenger",
      phone: `${channel}_${senderId}`,
    }).select("id").single();
    contactId = newContact?.id ?? null;
  }

  // Find or create conversation
  const prefix = channel === "instagram" ? "ig" : "fb";
  const externalId = `${prefix}_${senderId}`;

  let convId: string;
  const { data: conv } = await admin
    .from("conversations").select("id")
    .eq("organization_id", orgId).eq("external_id", externalId).single();

  if (conv) {
    convId = conv.id;
  } else {
    const { data: newConv, error: convErr } = await admin.from("conversations").insert({
      organization_id: orgId,
      channel,
      external_id: externalId,
      contact_id: contactId,
      last_message: "",
      unread_count: 0,
      is_online: false,
    }).select("id").single();
    if (convErr || !newConv) {
      console.error("Error creating conversation:", convErr?.message);
      return;
    }
    convId = newConv.id;
  }

  await admin.from("messages").insert({
    conversation_id: convId,
    external_id: mid,
    text,
    from_type: "contact",
  });

  await admin.from("conversations").update({
    last_message: text,
    updated_at: new Date().toISOString(),
    contact_id: contactId,
  }).eq("id", convId);

  await admin.from("conversations")
    .select("unread_count").eq("id", convId).single()
    .then(({ data }) => {
      admin.from("conversations")
        .update({ unread_count: (data?.unread_count ?? 0) + 1 })
        .eq("id", convId);
    });
}
