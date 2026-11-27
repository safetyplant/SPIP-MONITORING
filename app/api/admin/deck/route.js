import { NextResponse } from 'next/server';
import { DECKS } from '@/lib/decks';
import { isUnlockedReq } from '@/lib/guard';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Data slide untuk pratinjau dan unduhan PPT. Pembuatan file .pptx dilakukan di browser setelah pengguna selesai mengedit.
export async function GET(req) {
  const sp = Object.fromEntries(new URL(req.url).searchParams.entries());
  const build = DECKS[sp.type];
  if (!build) return NextResponse.json({ error: 'Jenis laporan tidak dikenal' }, { status: 400 });
  if (sp.type === 'mapping' && !(await isUnlockedReq(req))) {
    return NextResponse.json({ error: 'Mapping terkunci. Buka kunci dengan kata sandi login.' }, { status: 423 });
  }
  try {
    const deck = await build(sp);
    return NextResponse.json(deck, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Gagal menyusun laporan' }, { status: 500 });
  }
}
