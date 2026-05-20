/**
 * Mail Parser - Email content parsing
 */
import { simpleParser } from 'mailparser';

export interface ParsedEmail {
  account: string;
  messageId: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  headers: Record<string, string>;
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
    contentId: string;
    content: string | null;
  }>;
  receivedAt: Date;
  isRead: boolean;
  isStarred: boolean;
  isDeleted: boolean;
}

export async function parseEmail(rawBuffer: Buffer | string, accountId: string): Promise<ParsedEmail> {
  try {
    const buffer = typeof rawBuffer === 'string' ? Buffer.from(rawBuffer, 'base64') : rawBuffer;
    const parsed = await simpleParser(buffer, {
      skipImageLinks: true,
      skipTextToHtml: false,
      skipTextLinks: false,
    });

    const fromHeader = parsed.from?.value?.[0];
    const toHeader = Array.isArray(parsed.to) ? parsed.to[0] : parsed.to?.value?.[0];

    let from = '';
    let fromName = '';

    if (fromHeader) {
      fromName = fromHeader.name || '';
      from = fromHeader.address || '';
    }

    let to = '';
    if (toHeader) {
      // toHeader is EmailAddress (not AddressObject) since we already extracted value
      const emailAddr = toHeader as { address?: string };
      to = emailAddr.address || '';
    }

    if (!to && parsed.headers.has('delivered-to')) {
      to = parsed.headers.get('delivered-to') as string;
    }

    const attachments = (parsed.attachments || []).map(att => ({
      filename: att.filename || '',
      contentType: att.contentType,
      size: att.size,
      contentId: att.contentId || '',
      content: att.content ? att.content.toString('base64') : null,
    }));

    const messageId = parsed.messageId ||
      parsed.headers.get('message-id') ||
      `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      account: accountId,
      messageId: String(messageId).replace(/[<>]/g, ''),
      from: from.trim(),
      fromName: fromName.trim(),
      to: to.trim(),
      subject: (parsed.subject || '(No Subject)').trim(),
      text: parsed.text || '',
      html: parsed.html || '',
      headers: Object.fromEntries(
        Array.from(parsed.headers.entries()).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
      ) as Record<string, string>,
      attachments,
      receivedAt: parsed.date || new Date(),
      isRead: false,
      isStarred: false,
      isDeleted: false,
    };
  } catch (err) {
    console.error('[MailParser] Failed to parse email:', (err as Error).message);
    const rawStr = typeof rawBuffer === 'string' ? rawBuffer : rawBuffer.toString('utf8');

    return {
      account: accountId,
      messageId: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from: 'unknown@unknown',
      fromName: '',
      to: '',
      subject: '(Parse Error)',
      text: rawStr.substring(0, 1000),
      html: '',
      headers: {},
      attachments: [],
      receivedAt: new Date(),
      isRead: false,
      isStarred: false,
      isDeleted: false,
    };
  }
}
