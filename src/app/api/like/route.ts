import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      photo_id?: string;
      device_id?: string;
    };

    const photoId = body.photo_id?.trim();
    const deviceId = body.device_id?.trim();

    if (!photoId || !deviceId) {
      return NextResponse.json(
        { error: "photo_id and device_id are required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    const { data: photo, error: photoError } = await supabase
      .from("photos")
      .select("id")
      .eq("id", photoId)
      .maybeSingle();

    if (photoError) {
      throw photoError;
    }

    if (!photo) {
      return NextResponse.json({ error: "Foto tidak ditemukan." }, { status: 404 });
    }

    const { data: existing, error: lookupError } = await supabase
      .from("photo_likes")
      .select("id")
      .eq("photo_id", photoId)
      .eq("device_id", deviceId)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    let liked: boolean;

    if (existing) {
      const { error: deleteError } = await supabase
        .from("photo_likes")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        throw deleteError;
      }

      liked = false;
    } else {
      const { error: insertError } = await supabase
        .from("photo_likes")
        .insert({ photo_id: photoId, device_id: deviceId });

      if (insertError) {
        throw insertError;
      }

      liked = true;
    }

    const { count, error: countError } = await supabase
      .from("photo_likes")
      .select("*", { count: "exact", head: true })
      .eq("photo_id", photoId);

    if (countError) {
      throw countError;
    }

    return NextResponse.json({
      liked,
      like_count: count ?? 0,
    });
  } catch (error) {
    console.error("Like toggle failed:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui suka." },
      { status: 500 },
    );
  }
}
