// src/app/api/processing/processors/route.ts

export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getProcessorsMetadata } from '@/lib/processing/registry';
import '@/lib/processing/processors'; // Инициализация процессоров

/**
 * GET /api/processing/processors
 * Возвращает метаданные всех зарегистрированных процессоров
 */
export async function GET() {
  try {
    const processors = getProcessorsMetadata();
    return NextResponse.json({ processors });
  } catch (error) {
    console.error('Failed to get processors metadata:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve processors' },
      { status: 500 }
    );
  }
}