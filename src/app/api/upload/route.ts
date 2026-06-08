import { NextRequest, NextResponse } from "next/server";
import { PHOTO_LIMIT, STORAGE_BUCKET } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("photo");
    const deviceId = formData.get("device_id")?.toString().trim();

    if (!(file instanceof File) || !deviceId) {
      return NextResponse.json(
        { error: "photo and device_id are required" },
        { status: 400 },
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image uploads are allowed" },
        { status: 400 },
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be smaller than 10MB" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();
    const extension = file.type.includes("png") ? "png" : "jpg";
    const storagePath = `${deviceId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

    const { data, error: registerError } = await supabase.rpc(
      "register_photo_upload",
      {
        p_device_id: deviceId,
        p_photo_limit: PHOTO_LIMIT,
        p_storage_path: storagePath,
        p_public_url: publicUrl,
      },
    );

    if (registerError) {
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);

      if (registerError.message.includes("Photo limit reached")) {
        return NextResponse.json(
          { error: "Batas foto sudah habis." },
          { status: 403 },
        );
      }

      if (registerError.message.includes("Guest not found")) {
        return NextResponse.json(
          { error: "Tamu belum terdaftar." },
          { status: 404 },
        );
      }

      throw registerError;
    }

    const result = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      photo_id: result.photo_id,
      public_url: publicUrl,
      photo_count: result.photo_count,
      remaining: result.remaining,
    });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      { error: "Gagal mengunggah foto." },
      { status: 500 },
    );
  }
}
