import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import NotificationTemplate from '@/models/NotificationTemplate';

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');

    let query = {};
    if (category) query.category = category;
    if (type) query.type = type;

    const templates = await NotificationTemplate.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Get templates error:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const { name, type, category, smsContent, emailSubject, emailContent, emailHtml } =
      await req.json();

    const template = new NotificationTemplate({
      name,
      type,
      category,
      smsContent,
      emailSubject,
      emailContent,
      emailHtml,
      placeholders: extractPlaceholders(smsContent || emailContent),
    });

    await template.save();

    return NextResponse.json({ template, message: 'Template created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

function extractPlaceholders(text) {
  if (!text) return [];
  const matches = text.match(/\{(\w+)\}/g) || [];
  return matches.map((m) => m.slice(1, -1));
}
