import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

type FieldExtractionStatus = 'extracted' | 'not_found' | 'needs_review';

type ExtractedField<T> = {
  value: T;
  status: FieldExtractionStatus;
};

type ExtractedAdFields = {
  libraryId: ExtractedField<string | null>;
  advertiser: ExtractedField<string>;
  activeStatus: ExtractedField<string>;
  startedRunning: ExtractedField<string | null>;
  platforms: ExtractedField<string[]>;
  primaryText: ExtractedField<string>;
  headline: ExtractedField<string>;
  description: ExtractedField<string>;
  cta: ExtractedField<string>;
  landingPage: ExtractedField<string>;
  reuseSignals: ExtractedField<string[]>;
};

type ReprocessResult = {
  source_capture_path: string;
  output_capture_path: string;
  library_id: string | null;
  modal_text_path: string | null;
  viewport_text_path: string | null;
  selected_text_source: 'modal' | 'viewport' | 'none';
  selected_text_observation: string;
  extracted_fields_before: number;
  extracted_fields_after: number;
  missing_fields_before: number;
  missing_fields_after: number;
  has_usable_copy: boolean;
  needs_manual_review: boolean;
};

type ReprocessReport = {
  generated_at: string;
  visible_text_dir: string;
  captures_dir: string;
  source_run_dir: string | null;
  records_processed: number;
  extracted_fields_before: number;
  extracted_fields_after: number;
  missing_fields_before: number;
  missing_fields_after: number;
  records_with_usable_copy: number;
  records_needing_manual_review: number;
  modal_text_observations: string[];
  results: ReprocessResult[];
};

const FIELD_COUNT = 11;

function fail(message: string): never {
  throw new Error(message);
}

function parseArgs(args: string[]): Map<string, string> {
  const parsed = new Map<string, string>();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg?.startsWith('--')) {
      continue;
    }

    const value = args[index + 1];

    if (!value || value.startsWith('--')) {
      fail(`Missing value for ${arg}.`);
    }

    parsed.set(arg, value);
    index += 1;
  }

  return parsed;
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`Could not read JSON ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function textLines(text: string): string[] {
  return text.replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
}

function compactText(text: string): string {
  return textLines(text).join('\n');
}

function field<T>(value: T, extracted: boolean): ExtractedField<T> {
  return { value, status: extracted ? 'extracted' : 'not_found' };
}

function repairMojibake(text: string): string {
  return text
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€”/g, '-')
    .replace(/â€“/g, '-')
    .replace(/Â©/g, '(c)')
    .replace(/Â/g, '')
    .replace(/â€‹/g, '')
    .replace(/ðŸ‘‰/g, '')
    .replace(/ðŸ“š/g, '')
    .replace(/ðŸ’¬/g, '')
    .replace(/ðŸ“‘/g, '')
    .replace(/ðŸ’¡/g, '')
    .replace(/âœï¸/g, '')
    .replace(/â±ï¸/g, '')
    .replace(/ðŸŒ/g, '');
}

function looksLikeUsefulModalText(text: string): boolean {
  const lines = textLines(text);
  return lines.length > 3 && /Library ID: \d+/.test(text) && /Sponsored|Started running|Active/i.test(text);
}

function extractLibraryIdFromCapture(capture: any): string | null {
  return capture?.libraryId ?? capture?.examples?.[0]?.libraryId ?? null;
}

function slugForLibraryId(libraryId: string | null): string | null {
  return libraryId ? `meta-ad-library-${libraryId}` : null;
}

function findTextPath(visibleTextDir: string, slug: string, kind: 'modal' | 'viewport'): string | null {
  const path = join(visibleTextDir, `${slug}-${kind}.txt`);
  return existsSync(path) ? path : null;
}

function extractTargetBlock(text: string, libraryId: string | null): string {
  const cleaned = compactText(repairMojibake(text));
  const lines = textLines(cleaned);

  if (!libraryId) {
    return cleaned;
  }

  const idNeedle = `Library ID: ${libraryId}`;
  const idIndexes = lines.map((line, index) => (line.includes(idNeedle) ? index : -1)).filter((index) => index >= 0);

  if (idIndexes.length === 0) {
    return cleaned;
  }

  const idIndex = idIndexes[idIndexes.length - 1] ?? 0;
  let startIndex = idIndex;

  for (let index = idIndex; index >= 0; index -= 1) {
    if (/^Link to ad$/i.test(lines[index] ?? '') || /^Active$/i.test(lines[index] ?? '')) {
      startIndex = index;
      break;
    }
  }

  let endIndex = Math.min(lines.length, idIndex + 45);

  for (let index = idIndex + 1; index < lines.length; index += 1) {
    if (/^Close$/i.test(lines[index] ?? '')) {
      endIndex = index;
      break;
    }

    if (/^Active$/i.test(lines[index] ?? '') && index > idIndex + 5) {
      endIndex = index;
      break;
    }
  }

  return lines.slice(startIndex, endIndex).join('\n');
}

function isDomainLine(line: string): boolean {
  return /^https?:\/\//i.test(line) || /^[A-Z0-9.-]+\.[A-Z]{2,}(?:\/[A-Z0-9._~:/?#[\]@!$&'()*+,;=-]+)?$/i.test(line);
}

function isKnownCta(line: string): boolean {
  return /^(Learn more|Learn More|Sign Up|Sign up|Download|Install now|Try Google Workspace|Subscribe|Shop now|Get offer|Apply now)$/i.test(
    line,
  );
}

function extractStartedRunning(text: string): ExtractedField<string | null> {
  const match =
    text.match(/Started running(?: on)?\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i) ??
    text.match(/Started running(?: on)?\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  return field(match?.[1] ?? null, Boolean(match?.[1]));
}

function extractReuseSignals(text: string): ExtractedField<string[]> {
  const signals = [
    /This ad has multiple versions/i.test(text) ? 'ad_has_multiple_versions' : '',
    /\d+\s+ads use this creative and text/i.test(text) ? text.match(/\d+\s+ads use this creative and text/i)?.[0] ?? '' : '',
  ].filter(Boolean);
  return field(signals, signals.length > 0);
}

function extractFieldsFromText(text: string, fallbackLibraryId: string | null): ExtractedAdFields {
  const block = extractTargetBlock(text, fallbackLibraryId);
  const lines = textLines(block);
  const libraryMatch = block.match(/Library ID:\s*(\d+)/i);
  const sponsoredIndex = lines.findIndex((line) => /^Sponsored$/i.test(line));
  const advertiser = sponsoredIndex > 0 ? lines[sponsoredIndex - 1] ?? '' : '';
  const afterSponsored = sponsoredIndex >= 0 ? lines.slice(sponsoredIndex + 1) : [];
  const domainIndex = afterSponsored.findIndex((line) => isDomainLine(line));
  const ctaIndex = afterSponsored.findIndex((line) => isKnownCta(line));
  const primaryEnd =
    domainIndex >= 0 ? domainIndex : ctaIndex >= 0 ? ctaIndex : afterSponsored.findIndex((line) => /^0:00\s+\//.test(line));
  const primaryLines = afterSponsored
    .slice(0, primaryEnd >= 0 ? primaryEnd : afterSponsored.length)
    .filter((line) => !/^0:00\s+\//.test(line));
  const domain = domainIndex >= 0 ? afterSponsored[domainIndex] ?? '' : '';
  const headline =
    domainIndex >= 0 && afterSponsored[domainIndex + 1] && !isKnownCta(afterSponsored[domainIndex + 1] ?? '')
      ? afterSponsored[domainIndex + 1] ?? ''
      : '';
  const description =
    domainIndex >= 0 && afterSponsored[domainIndex + 2] && !isKnownCta(afterSponsored[domainIndex + 2] ?? '')
      ? afterSponsored[domainIndex + 2] ?? ''
      : '';
  const cta =
    [...afterSponsored].reverse().find((line) => isKnownCta(line)) ??
    (ctaIndex >= 0 ? afterSponsored[ctaIndex] ?? '' : '');

  return {
    libraryId: field(libraryMatch?.[1] ?? fallbackLibraryId, Boolean(libraryMatch?.[1] ?? fallbackLibraryId)),
    advertiser: field(advertiser || 'unknown', advertiser !== ''),
    activeStatus: field(/\bActive\b/i.test(block) ? 'active' : 'unknown', /\bActive\b/i.test(block)),
    startedRunning: extractStartedRunning(block),
    platforms: field([], false),
    primaryText: field(primaryLines.join('\n'), primaryLines.length > 0),
    headline: field(headline, headline !== ''),
    description: field(description, description !== ''),
    cta: field(cta || 'unknown', cta !== ''),
    landingPage: field(domain || 'unknown', domain !== ''),
    reuseSignals: extractReuseSignals(block),
  };
}

function countExtracted(fields: ExtractedAdFields): number {
  return Object.values(fields).filter((fieldValue) => fieldValue.status === 'extracted').length;
}

function originalFieldCounts(capture: any): { extracted: number; missing: number } {
  const example = capture?.examples?.[0] ?? {};
  const statuses = [
    example.libraryId ? 'extracted' : 'not_found',
    ...Object.values(example.fieldExtractionStatus ?? {}),
  ];
  const extracted = statuses.filter((status) => status === 'extracted').length;
  return { extracted, missing: FIELD_COUNT - extracted };
}

function applyExtractedFields(capture: any, fields: ExtractedAdFields, sourceTextPath: string | null): any {
  const cloned = structuredClone(capture);
  const example = cloned.examples?.[0];

  if (!example) {
    return cloned;
  }

  cloned.libraryId = fields.libraryId.value;
  example.libraryId = fields.libraryId.value;
  example.advertiser = fields.advertiser.value;
  example.activeStatus = fields.activeStatus.value;
  example.startDateIfVisible = fields.startedRunning.value;
  example.platform = fields.platforms.value;
  example.cta = fields.cta.value;
  example.landingPage = fields.landingPage.value;
  example.visibleCopy = {
    primaryText: fields.primaryText.value,
    headline: fields.headline.value,
    description: fields.description.value,
  };
  example.reuseSignals = fields.reuseSignals.value;
  example.longevitySignal =
    fields.startedRunning.status === 'extracted' ? `started_running_${fields.startedRunning.value}` : 'unknown_needs_review';
  example.fieldExtractionStatus = {
    advertiser: fields.advertiser.status,
    activeStatus: fields.activeStatus.status,
    startDateIfVisible: fields.startedRunning.status,
    platform: fields.platforms.status,
    primaryText: fields.primaryText.status,
    headline: fields.headline.status,
    description: fields.description.status,
    cta: fields.cta.status,
    landingPage: fields.landingPage.status,
    reuseSignals: fields.reuseSignals.status,
  };
  example.extractionStatus = countExtracted(fields) >= 7 ? 'captured_needs_human_review' : 'partial_needs_review';
  example.extractionNotes = [
    ...(example.extractionNotes ?? []),
    `Reprocessed from existing text evidence${sourceTextPath ? `: ${sourceTextPath}` : ''}.`,
    'Original capture record was not overwritten.',
  ];

  return cloned;
}

function captureFiles(capturesDir: string, sourceRunDir: string | null): string[] {
  if (sourceRunDir && existsSync(sourceRunDir)) {
    const sourceFiles = readdirSync(sourceRunDir)
      .filter((file) => /^url-\d+-paid-ads-source-capture\.json$/.test(file))
      .map((file) => join(sourceRunDir, file));

    if (sourceFiles.length > 0) {
      return sourceFiles;
    }
  }

  return readdirSync(capturesDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => join(capturesDir, file));
}

function formatMarkdown(report: ReprocessReport): string {
  return `# Paid Ads Capture Reprocess Report

Generated at: ${report.generated_at}
Visible text dir: ${report.visible_text_dir}
Captures dir: ${report.captures_dir}
Source run dir: ${report.source_run_dir ?? 'not provided'}

## Summary

- Records processed: ${report.records_processed}
- Extracted fields before: ${report.extracted_fields_before}
- Extracted fields after: ${report.extracted_fields_after}
- Missing fields before: ${report.missing_fields_before}
- Missing fields after: ${report.missing_fields_after}
- Records with usable copy: ${report.records_with_usable_copy}
- Records needing manual review: ${report.records_needing_manual_review}

## Modal Text Observations

${report.modal_text_observations.map((observation) => `- ${observation}`).join('\n')}

## Results

${report.results
  .map(
    (result) => `### ${result.library_id ?? basename(result.source_capture_path)}

- Source capture path: ${result.source_capture_path}
- Reprocessed capture path: ${result.output_capture_path}
- Modal text path: ${result.modal_text_path ?? 'not found'}
- Viewport text path: ${result.viewport_text_path ?? 'not found'}
- Selected text source: ${result.selected_text_source}
- Selected text observation: ${result.selected_text_observation}
- Extracted fields before: ${result.extracted_fields_before}
- Extracted fields after: ${result.extracted_fields_after}
- Missing fields before: ${result.missing_fields_before}
- Missing fields after: ${result.missing_fields_after}
- Has usable copy: ${result.has_usable_copy}
- Needs manual review: ${result.needs_manual_review}`,
  )
  .join('\n\n')}

## Human Review

- [ ] Review extracted advertiser, copy, headline, description, CTA, and domain.
- [ ] Fill platform labels manually if the visible text only contains icon placeholders.
- [ ] Do not infer profitability from reuse or longevity signals.
- [ ] Run creative pattern analysis only after records are reviewed.
`;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const visibleTextDir = resolve(process.cwd(), args.get('--visible-text-dir') ?? 'data/paid-ads/ad-library-visible-text');
  const capturesDir = resolve(process.cwd(), args.get('--captures-dir') ?? 'data/paid-ads/ad-library-captures');
  const sourceRunDir = args.get('--source-run-dir') ? resolve(process.cwd(), args.get('--source-run-dir') ?? '') : null;

  if (!existsSync(visibleTextDir)) fail(`Visible text dir not found: ${visibleTextDir}`);
  if (!existsSync(capturesDir)) fail(`Captures dir not found: ${capturesDir}`);
  if (sourceRunDir && !existsSync(sourceRunDir)) fail(`Source run dir not found: ${sourceRunDir}`);

  const generatedAt = new Date().toISOString();
  const runId = `run-${generatedAt.replace(/[:.]/g, '-')}`;
  const runDir = join(process.cwd(), 'output', runId);
  const reprocessedDir = join(runDir, 'reprocessed-captures');
  mkdirSync(reprocessedDir, { recursive: true });

  const results: ReprocessResult[] = [];
  const observations: string[] = [];

  for (const capturePath of captureFiles(capturesDir, sourceRunDir)) {
    const capture = readJson(capturePath) as any;
    const libraryId = extractLibraryIdFromCapture(capture);
    const slug = slugForLibraryId(libraryId);
    const modalTextPath = slug ? findTextPath(visibleTextDir, slug, 'modal') : null;
    const viewportTextPath = slug ? findTextPath(visibleTextDir, slug, 'viewport') : null;
    const modalText = modalTextPath ? readFileSync(modalTextPath, 'utf8') : '';
    const viewportText = viewportTextPath ? readFileSync(viewportTextPath, 'utf8') : '';
    const selectedTextSource = looksLikeUsefulModalText(modalText) ? 'modal' : viewportText ? 'viewport' : 'none';
    const selectedText = selectedTextSource === 'modal' ? modalText : selectedTextSource === 'viewport' ? viewportText : '';
    const selectedTextObservation =
      selectedTextSource === 'modal'
        ? 'Modal text contained structured ad detail.'
        : modalText
          ? 'Modal text contained only narrow evidence, so viewport text was used as fallback.'
          : 'Modal text was missing, so viewport text was used as fallback.';
    const fields = extractFieldsFromText(selectedText, libraryId);
    const before = originalFieldCounts(capture);
    const afterExtracted = countExtracted(fields);
    const outputPath = join(reprocessedDir, `${slug ?? basename(capturePath, '.json')}.json`);
    const reprocessed = applyExtractedFields(capture, fields, selectedTextSource === 'none' ? null : selectedTextSource === 'modal' ? modalTextPath : viewportTextPath);

    writeFileSync(outputPath, `${JSON.stringify(reprocessed, null, 2)}\n`, 'utf8');

    observations.push(
      `${slug ?? basename(capturePath)}: modal text ${modalText ? `has ${textLines(modalText).length} line(s)` : 'is missing'}; ${
        looksLikeUsefulModalText(modalText) ? 'used modal text' : 'used viewport fallback'
      }.`,
    );
    results.push({
      source_capture_path: capturePath,
      output_capture_path: outputPath,
      library_id: libraryId,
      modal_text_path: modalTextPath,
      viewport_text_path: viewportTextPath,
      selected_text_source: selectedTextSource,
      selected_text_observation: selectedTextObservation,
      extracted_fields_before: before.extracted,
      extracted_fields_after: afterExtracted,
      missing_fields_before: before.missing,
      missing_fields_after: FIELD_COUNT - afterExtracted,
      has_usable_copy: fields.primaryText.status === 'extracted',
      needs_manual_review: afterExtracted < FIELD_COUNT,
    });
  }

  const report: ReprocessReport = {
    generated_at: generatedAt,
    visible_text_dir: visibleTextDir,
    captures_dir: capturesDir,
    source_run_dir: sourceRunDir,
    records_processed: results.length,
    extracted_fields_before: results.reduce((total, result) => total + result.extracted_fields_before, 0),
    extracted_fields_after: results.reduce((total, result) => total + result.extracted_fields_after, 0),
    missing_fields_before: results.reduce((total, result) => total + result.missing_fields_before, 0),
    missing_fields_after: results.reduce((total, result) => total + result.missing_fields_after, 0),
    records_with_usable_copy: results.filter((result) => result.has_usable_copy).length,
    records_needing_manual_review: results.filter((result) => result.needs_manual_review).length,
    modal_text_observations: observations,
    results,
  };
  const reportJsonPath = join(runDir, 'paid-ads-capture-reprocess-report.json');
  const reportMarkdownPath = join(runDir, 'paid-ads-capture-reprocess-report.md');

  writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(reportMarkdownPath, formatMarkdown(report), 'utf8');

  console.log(`Paid ads capture reprocess complete.
Report JSON: ${reportJsonPath}
Report Markdown: ${reportMarkdownPath}
Records processed: ${report.records_processed}
Extracted fields before: ${report.extracted_fields_before}
Extracted fields after: ${report.extracted_fields_after}
Records with usable copy: ${report.records_with_usable_copy}`);
}

main();
