/**
 * POST /api/admin/domains/sync-cloudflare
 * Sync domains from Cloudflare account into tmailCC database.
 * Fetches all zones from Cloudflare API and upserts them into the domains table.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyToken, getProfile } from '@/lib/auth';

async function requireAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No token provided', status: 401 };
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  const profile = await getProfile(decoded.sub);
  if (!profile) {
    return { error: 'User not found', status: 401 };
  }

  if (!profile.is_active) {
    return { error: 'Account is disabled', status: 403 };
  }

  if (profile.role !== 'admin') {
    return { error: 'Admin access required', status: 403 };
  }

  return { user: { ...decoded, ...profile } };
}

export const dynamic = 'force-dynamic';

async function getCloudflareConfig() {
  if (!supabaseAdmin) return null;
  let cfApiToken = process.env.CLOUDFLARE_API_TOKEN || '';
  let cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';

  const { data: cfConfig } = await supabaseAdmin
    .from('config')
    .select('key, value')
    .in('key', ['cloudflareApiToken', 'cloudflareAccountId']);

  if (cfConfig) {
    for (const row of cfConfig) {
      if (row.key === 'cloudflareApiToken') {
        const val = row.value;
        cfApiToken = typeof val === 'string' ? val : (val as any) || '';
      }
      if (row.key === 'cloudflareAccountId') {
        const val = row.value;
        cfAccountId = typeof val === 'string' ? val : (val as any) || '';
      }
    }
  }
  return { cfApiToken, cfAccountId };
}

/**
 * GET /api/admin/domains/sync-cloudflare
 * List all active domains/zones in Cloudflare and mark alreadySynced ones.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const cfConfig = await getCloudflareConfig();
  if (!cfConfig || !cfConfig.cfApiToken) {
    return NextResponse.json({
      error: 'Cloudflare API Token chưa được cấu hình.',
    }, { status: 400 });
  }

  try {
    let url = 'https://api.cloudflare.com/client/v4/zones?per_page=50&status=active';
    if (cfConfig.cfAccountId) {
      url += `&account.id=${cfConfig.cfAccountId}`;
    }

    const cfResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${cfConfig.cfApiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!cfResponse.ok) {
      const errorData = await cfResponse.json().catch(() => ({}));
      const errorMsg = (errorData as any)?.errors?.[0]?.message || `Cloudflare API error: ${cfResponse.status}`;
      return NextResponse.json({ error: errorMsg }, { status: 502 });
    }

    const cfData = await cfResponse.json() as any;
    if (!cfData.success || !Array.isArray(cfData.result)) {
      return NextResponse.json({ error: 'Cloudflare API returned invalid data' }, { status: 502 });
    }

    // Get existing domains in database
    const { data: existingDomains } = await supabaseAdmin!
      .from('domains')
      .select('domain');

    const existingSet = new Set((existingDomains || []).map((d: any) => d.domain.toLowerCase()));

    const list = cfData.result.map((zone: any) => ({
      domain: zone.name,
      id: zone.id,
      status: zone.status,
      alreadySynced: existingSet.has(zone.name.toLowerCase()),
    }));

    return NextResponse.json({ success: true, domains: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/domains/sync-cloudflare
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const cfConfig = await getCloudflareConfig();
  if (!cfConfig || !cfConfig.cfApiToken) {
    return NextResponse.json({
      error: 'Cloudflare API Token chưa được cấu hình. Vui lòng thêm CLOUDFLARE_API_TOKEN vào .env hoặc cấu hình trong Admin > Config.',
    }, { status: 400 });
  }

  const { cfApiToken, cfAccountId } = cfConfig;

  // Read selected domains to sync if provided in request body
  let selectedDomains: string[] | null = null;
  try {
    const body = await request.json().catch(() => null);
    if (body && Array.isArray(body.domains)) {
      selectedDomains = body.domains.map((d: string) => d.toLowerCase().trim());
    }
  } catch (e) {
    // Ignore body parsing failures
  }

  try {
    // Fetch all zones from Cloudflare
    let url = 'https://api.cloudflare.com/client/v4/zones?per_page=50&status=active';
    if (cfAccountId) {
      url += `&account.id=${cfAccountId}`;
    }

    const cfResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${cfApiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!cfResponse.ok) {
      const errorData = await cfResponse.json().catch(() => ({}));
      const errorMsg = (errorData as any)?.errors?.[0]?.message || `Cloudflare API error: ${cfResponse.status}`;
      return NextResponse.json({ error: errorMsg }, { status: 502 });
    }

    const cfData = await cfResponse.json() as {
      success: boolean;
      result: Array<{ name: string; status: string; id: string }>;
      result_info?: { total_count: number };
    };

    if (!cfData.success || !Array.isArray(cfData.result)) {
      return NextResponse.json({ error: 'Cloudflare API returned invalid data' }, { status: 502 });
    }

    const cloudflareDomains = cfData.result.map(zone => zone.name.toLowerCase());

    // Get existing domains from DB
    const { data: existingDomains } = await supabaseAdmin
      .from('domains')
      .select('domain');

    const existingSet = new Set((existingDomains || []).map((d: any) => d.domain.toLowerCase()));

    // Find domains to process (if selectedDomains is provided, we process those, otherwise we only process the new ones not in DB)
    let domainsToProcess: string[] = [];
    if (selectedDomains) {
      domainsToProcess = cloudflareDomains.filter(d => selectedDomains!.includes(d));
    } else {
      domainsToProcess = cloudflareDomains.filter(d => !existingSet.has(d));
    }

    // Insert new domains and configure them
    const added: string[] = [];
    const errors: string[] = [];
    const configLogs: string[] = [];

    for (const domain of domainsToProcess) {
      const zoneInfo = cfData.result.find(z => z.name.toLowerCase() === domain);
      if (!zoneInfo) continue;

      // 1. Insert into DB if not exists
      const isAlreadyInDb = existingSet.has(domain);
      if (!isAlreadyInDb) {
        const { error: insertError } = await supabaseAdmin
          .from('domains')
          .insert({
            domain,
            label: '',
            is_active: true,
            is_default: false,
            added_by: auth.user!.id,
            note: 'Synced from Cloudflare',
          });

        if (insertError) {
          if (insertError.code === '23505') {
            configLogs.push(`[${domain}] Domain đã tồn tại trong hệ thống.`);
          } else {
            errors.push(`${domain}: DB error - ${insertError.message}`);
            continue;
          }
        } else {
          added.push(domain);
        }
      } else {
        configLogs.push(`[${domain}] Domain đã tồn tại trong DB, tiến hành kiểm tra/cập nhật cấu hình Cloudflare...`);
      }

      // 2. Automate Cloudflare Configuration (DNS, Email Routing, Worker Route)
      const zoneId = zoneInfo.id;
      configLogs.push(`[${domain}] Bắt đầu cấu hình tự động...`);

      try {
        const headers = {
          'Authorization': `Bearer ${cfApiToken}`,
          'Content-Type': 'application/json',
        };

        // A. Cấu hình DNS Records (MX & SPF TXT)
        configLogs.push(`[${domain}] Đang kiểm tra bản ghi DNS...`);
        const dnsResp = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?per_page=100`, { headers });
        if (!dnsResp.ok) {
          throw new Error(`Không thể đọc DNS (HTTP ${dnsResp.status}). Cần bổ sung quyền Zone:DNS:Edit.`);
        }
        const dnsData = await dnsResp.json() as any;
        const currentRecords = dnsData.result || [];

        const hasCloudflareMX = currentRecords.some((r: any) => r.type === 'MX' && r.content.includes('mx.cloudflare.net'));
        const hasSPF = currentRecords.some((r: any) => r.type === 'TXT' && r.content.includes('v=spf1'));

        if (!hasCloudflareMX) {
          configLogs.push(`[${domain}] Đang tạo 3 bản ghi MX Cloudflare...`);
          const mxRecords = [
            { type: 'MX', name: '@', content: 'isaac.mx.cloudflare.net', priority: 10, ttl: 3600 },
            { type: 'MX', name: '@', content: 'lisa.mx.cloudflare.net', priority: 20, ttl: 3600 },
            { type: 'MX', name: '@', content: 'amir.mx.cloudflare.net', priority: 90, ttl: 3600 }
          ];
          for (const record of mxRecords) {
            const addMx = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
              method: 'POST',
              headers,
              body: JSON.stringify(record)
            });
            if (!addMx.ok) {
              const mxErr = await addMx.json().catch(() => ({}));
              throw new Error(`Lỗi tạo MX: ${mxErr.errors?.[0]?.message || addMx.statusText}`);
            }
          }
          configLogs.push(`[${domain}] Đã tạo MX thành công.`);
        } else {
          configLogs.push(`[${domain}] Bản ghi MX Cloudflare đã có sẵn.`);
        }

        if (!hasSPF) {
          configLogs.push(`[${domain}] Đang tạo bản ghi TXT SPF...`);
          const addSpf = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              type: 'TXT',
              name: '@',
              content: 'v=spf1 include:_spf.mx.cloudflare.net ~all',
              ttl: 3600
            })
          });
          if (!addSpf.ok) {
            const spfErr = await addSpf.json().catch(() => ({}));
            throw new Error(`Lỗi tạo SPF: ${spfErr.errors?.[0]?.message || addSpf.statusText}`);
          }
          configLogs.push(`[${domain}] Đã tạo SPF thành công.`);
        } else {
          configLogs.push(`[${domain}] Bản ghi SPF đã có sẵn.`);
        }

        // B. Bật Email Routing (Cố gắng bật, nếu lỗi 403 thì cảnh báo và bỏ qua để làm tiếp bước C)
        try {
          configLogs.push(`[${domain}] Đang kiểm tra trạng thái Email Routing...`);
          const routeStatusResp = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/email/routing`, { headers });
          if (routeStatusResp.ok) {
            const routeStatusData = await routeStatusResp.json() as any;
            const isRoutingEnabled = routeStatusData.result?.enabled;

            if (!isRoutingEnabled) {
              configLogs.push(`[${domain}] Đang bật Email Routing...`);
              const enableRoute = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/email/routing`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ enabled: true })
              });
              if (!enableRoute.ok) {
                const enableErr = await enableRoute.json().catch(() => ({}));
                configLogs.push(`[${domain}] Không thể tự bật Email Routing: ${enableErr.errors?.[0]?.message || enableRoute.statusText}`);
              } else {
                configLogs.push(`[${domain}] Đã bật Email Routing thành công.`);
              }
            } else {
              configLogs.push(`[${domain}] Email Routing đã được bật trước đó.`);
            }
          } else {
            configLogs.push(`[${domain}] Cảnh báo: Không thể kiểm tra/bật Email Routing (HTTP ${routeStatusResp.status}). Vui lòng tự bật công tắc này thủ công trên web Cloudflare.`);
          }
        } catch (routeErr: any) {
          configLogs.push(`[${domain}] Cảnh báo kiểm tra Email Routing: ${routeErr.message}. Vui lòng tự bật thủ công.`);
        }

        // C. Cấu hình Catch-All Rule trỏ vào Cloudflare Worker 'tmail-worker'
        configLogs.push(`[${domain}] Đang kiểm tra cấu hình Catch-All Rule...`);
        const catchAllResp = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/email/routing/rules/catch_all`, { headers });
        
        let shouldUpdateCatchAll = true;
        if (catchAllResp.ok) {
          const catchAllData = await catchAllResp.json() as any;
          const currentCatchAll = catchAllData.result;
          
          if (currentCatchAll) {
            const isWorkerAction = currentCatchAll.enabled && 
              currentCatchAll.actions?.some((a: any) => a.type === 'worker' && a.value?.includes('tmail-worker'));
            
            if (isWorkerAction) {
              shouldUpdateCatchAll = false;
              configLogs.push(`[${domain}] Catch-All Rule trỏ tới tmail-worker đã được bật và cấu hình chính xác.`);
            }
          }
        }

        if (shouldUpdateCatchAll) {
          configLogs.push(`[${domain}] Đang cập nhật Catch-All Rule trỏ tới tmail-worker...`);
          const updateCatchAll = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/email/routing/rules/catch_all`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              enabled: true,
              actions: [{ type: 'worker', value: ['tmail-worker'] }]
            })
          });
          if (!updateCatchAll.ok) {
            const ruleErr = await updateCatchAll.json().catch(() => ({}));
            throw new Error(`Lỗi cấu hình Catch-All: ${ruleErr.errors?.[0]?.message || updateCatchAll.statusText}`);
          }
          configLogs.push(`[${domain}] Cấu hình Catch-All Rule trỏ tới tmail-worker thành công.`);
        }

        configLogs.push(`[${domain}] Hoàn tất cấu hình Cloudflare thành công!`);

      } catch (cfErr: any) {
        console.error(`[Admin] Cloudflare auto-config failed for ${domain}:`, cfErr);
        configLogs.push(`[${domain}] Lỗi cấu hình Cloudflare: ${cfErr.message}`);
        errors.push(`${domain}: Auto-config failed - ${cfErr.message}`);
      }
    }

    // Also find domains in DB that are NOT in Cloudflare (for info only, don't delete)
    const notInCloudflare = Array.from(existingSet).filter(d => !cloudflareDomains.includes(d));

    return NextResponse.json({
      success: true,
      cloudflareTotal: cloudflareDomains.length,
      cloudflareDomains,
      added,
      alreadyExisted: cloudflareDomains.filter(d => existingSet.has(d)),
      notInCloudflare,
      errors,
      logs: configLogs,
    });
  } catch (err: any) {
    console.error('[Admin] Cloudflare sync error:', err);
    return NextResponse.json({ error: err.message || 'Failed to sync with Cloudflare' }, { status: 500 });
  }
}

