import { NextRequest, NextResponse } from "next/server";
import { PHOTO_LIMIT } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("device_id");

  if (!deviceId) {
    return NextResponse.json(
      { error: "device_id is required" },
      { status: 400 },
    );
  }

  try {
    const supabase = createServerClient();
    const { data: guest, error } = await supabase
      .from("guests")
      .select("name, photo_count")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!guest) {
      return NextResponse.json({ registered: false });
    }

    return NextResponse.json({
      registered: true,
      name: guest.name,
      photo_count: guest.photo_count,
      remaining: Math.max(PHOTO_LIMIT - guest.photo_count, 0),
      photo_limit: PHOTO_LIMIT,
    });
  } catch (error) {
    console.error("Guest lookup failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch guest status" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name?: string;
      device_id?: string;
    };

    const name = body.name?.trim();
    const deviceId = body.device_id?.trim();

    if (!name || !deviceId) {
      return NextResponse.json(
        { error: "name and device_id are required" },
        { status: 400 },
      );
    }

    if (name.length > 80) {
      return NextResponse.json(
        { error: "Name is too long" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();
    const { data: guest, error } = await supabase
      .from("guests")
      .upsert(
        {
          name,
          device_id: deviceId,
        },
        { onConflict: "device_id" },
      )
      .select("name, photo_count")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      name: guest.name,
      photo_count: guest.photo_count,
      remaining: Math.max(PHOTO_LIMIT - guest.photo_count, 0),
      photo_limit: PHOTO_LIMIT,
    });
  } catch (error) {
    console.error("Guest registration failed:", error);
    return NextResponse.json(
      { error: "Failed to register guest" },
      { status: 500 },
    );
  }
}
