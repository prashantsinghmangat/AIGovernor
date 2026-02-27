import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import JSZip from 'jszip';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';

const MAX_ZIP_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 5000;
const MAX_UNCOMPRESSED_SIZE = 200 * 1024 * 1024; // 200MB

// Code file extensions we keep from the ZIP
const SCAN_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rs', 'rb',
  'php', 'cs', 'cpp', 'c', 'h', 'hpp', 'swift', 'kt', 'scala',
  'vue', 'svelte', 'dart', 'lua', 'sh', 'bash', 'sql',
]);

// Manifest / dependency files we also keep
const MANIFEST_FILES = new Set([
  'package.json', 'requirements.txt', 'Pipfile', 'pyproject.toml',
  'pom.xml', 'build.gradle', 'go.mod', 'Cargo.toml',
  'Gemfile', 'composer.json', 'packages.config',
]);

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // 1. Auth check
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();
  if (!profile?.company_id) {
    return NextResponse.json({ error: 'No company found', code: 'NOT_FOUND' }, { status: 403 });
  }

  // 2. Parse FormData
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const name = (formData.get('name') as string || '').trim();
  const language = (formData.get('language') as string || '').trim() || null;

  // 3. Validate inputs
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided', code: 'VALIDATION_ERROR' }, { status: 400 });
  }
  if (!file.name.endsWith('.zip')) {
    return NextResponse.json({ error: 'File must be a .zip archive', code: 'VALIDATION_ERROR' }, { status: 400 });
  }
  if (file.size > MAX_ZIP_SIZE) {
    return NextResponse.json({ error: `File too large (max ${MAX_ZIP_SIZE / 1024 / 1024}MB)`, code: 'VALIDATION_ERROR' }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: 'Project name is required', code: 'VALIDATION_ERROR' }, { status: 400 });
  }
  if (name.length > 200) {
    return NextResponse.json({ error: 'Project name must be 200 characters or fewer', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  // 4. Extract ZIP and build file map
  let zip: JSZip;
  try {
    const arrayBuffer = await file.arrayBuffer();
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch {
    return NextResponse.json({ error: 'Failed to read ZIP archive — file may be corrupted', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const fileMap: Record<string, string> = {};
  let totalUncompressed = 0;
  let fileCount = 0;

  const entries = Object.entries(zip.files);
  for (const [relativePath, zipEntry] of entries) {
    if (zipEntry.dir) continue;

    const path = relativePath;

    // Determine extension and filename
    const parts = path.split('.');
    const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
    const fileName = path.split('/').pop() || '';

    // Only keep code files, manifest files, and .csproj files
    const isCode = SCAN_EXTENSIONS.has(ext);
    const isManifest = MANIFEST_FILES.has(fileName);
    const isCsproj = ext === 'csproj';

    if (!isCode && !isManifest && !isCsproj) continue;

    const content = await zipEntry.async('base64');
    const size = Buffer.from(content, 'base64').length;
    totalUncompressed += size;
    fileCount++;

    if (fileCount > MAX_FILES) {
      return NextResponse.json(
        { error: `ZIP contains too many files (max ${MAX_FILES})`, code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }
    if (totalUncompressed > MAX_UNCOMPRESSED_SIZE) {
      return NextResponse.json(
        { error: 'Extracted content too large (max 200MB)', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    fileMap[path] = content;
  }

  if (Object.keys(fileMap).length === 0) {
    return NextResponse.json(
      { error: 'No code files found in the ZIP archive', code: 'VALIDATION_ERROR' },
      { status: 400 },
    );
  }

  // 5. Strip common prefix from paths (ZIPs often have a root directory)
  const paths = Object.keys(fileMap);
  if (paths.length > 0) {
    const firstParts = paths[0].split('/');
    let commonPrefixLength = 0;

    for (let i = 0; i < firstParts.length - 1; i++) {
      const prefix = firstParts.slice(0, i + 1).join('/') + '/';
      if (paths.every(p => p.startsWith(prefix))) {
        commonPrefixLength = prefix.length;
      } else {
        break;
      }
    }

    if (commonPrefixLength > 0) {
      const cleaned: Record<string, string> = {};
      for (const [p, content] of Object.entries(fileMap)) {
        cleaned[p.substring(commonPrefixLength)] = content;
      }
      Object.keys(fileMap).forEach(k => delete fileMap[k]);
      Object.assign(fileMap, cleaned);
    }
  }

  // 6. Upsert repository using admin client (bypasses RLS)
  const admin = createAdminSupabase();
  const fullName = `upload/${name}`;

  // Check for existing upload repo with the same name for this company
  const { data: existingRepo } = await admin
    .from('repositories')
    .select('id')
    .eq('company_id', profile.company_id)
    .eq('name', name)
    .eq('source', 'upload')
    .eq('is_active', true)
    .single();

  let repoId: string;

  if (existingRepo) {
    repoId = existingRepo.id;
    // Update metadata for the re-upload
    await admin.from('repositories').update({
      language,
      metadata: { upload_filename: file.name, file_count: Object.keys(fileMap).length } as unknown as Json,
    }).eq('id', repoId);
  } else {
    const { data: newRepo, error: repoError } = await admin
      .from('repositories')
      .insert({
        company_id: profile.company_id,
        name,
        full_name: fullName,
        source: 'upload',
        default_branch: 'main',
        language,
        is_private: true,
        is_active: true,
        metadata: { upload_filename: file.name, file_count: Object.keys(fileMap).length } as unknown as Json,
      })
      .select('id')
      .single();

    if (repoError || !newRepo) {
      console.error('[Upload] Failed to create repository:', repoError?.message);
      return NextResponse.json({ error: 'Failed to create project', code: 'INTERNAL_ERROR' }, { status: 500 });
    }
    repoId = newRepo.id;
  }

  // 7. Create scan record
  const scanId = crypto.randomUUID();
  const storageKey = `${profile.company_id}/${repoId}/${scanId}.json`;

  const { error: scanError } = await admin.from('scans').insert({
    id: scanId,
    company_id: profile.company_id,
    repository_id: repoId,
    triggered_by: user.id,
    scan_type: 'upload',
    status: 'pending',
    progress: 0,
    summary: { upload_storage_key: storageKey } as unknown as Json,
  });

  if (scanError) {
    console.error('[Upload] Failed to create scan:', scanError.message);
    return NextResponse.json({ error: 'Failed to create scan', code: 'INTERNAL_ERROR' }, { status: 500 });
  }

  // 8. Store file map in Supabase Storage
  const fileMapJson = JSON.stringify(fileMap);
  const fileMapBlob = new Blob([fileMapJson], { type: 'application/json' });

  const { error: uploadError } = await admin.storage
    .from('scan-uploads')
    .upload(storageKey, fileMapBlob, {
      contentType: 'application/json',
      upsert: true,
    });

  if (uploadError) {
    console.error('[Upload] Failed to store upload data:', uploadError.message);
    // Clean up the scan record since we cannot proceed without the stored file map
    await admin.from('scans').delete().eq('id', scanId);
    return NextResponse.json({ error: 'Failed to store upload data', code: 'INTERNAL_ERROR' }, { status: 500 });
  }

  // 9. Trigger async processing after the response is sent
  after(async () => {
    try {
      const { processUploadScan } = await import('@/lib/scan/upload-processor');
      await processUploadScan(scanId);
    } catch (err) {
      console.error('[Upload] Async processing error:', err instanceof Error ? err.message : err);
    }
  });

  // 10. Return response
  return NextResponse.json({
    data: {
      repository_id: repoId,
      scan_id: scanId,
      message: 'Upload received, scan started',
      file_count: Object.keys(fileMap).length,
    },
  });
}
