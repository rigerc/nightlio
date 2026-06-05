import { getMoodLabel } from './moodUtils';
import type { Entry, Group } from '../types';

function triggerDownload(uri: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportEntryToMarkdown(entry: Entry, groups: Group[] = []): void {
  const optionToGroup = new Map<number, string>();
  for (const group of groups) {
    for (const option of group.options ?? []) {
      optionToGroup.set(option.id, group.name);
    }
  }

  const groupedActivities: Record<string, string[]> = {};
  for (const sel of entry.selections ?? []) {
    const groupName = optionToGroup.get(sel.id) ?? 'Other';
    if (!groupedActivities[groupName]) groupedActivities[groupName] = [];
    groupedActivities[groupName].push(sel.name);
  }

  const timeStr = entry.created_at
    ? new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';

  let frontmatter = '---\n';
  frontmatter += `date: "${entry.date ?? ''}"\n`;
  if (timeStr) frontmatter += `time: "${timeStr}"\n`;
  frontmatter += `mood: ${entry.mood ?? ''}\n`;
  frontmatter += `mood_label: "${getMoodLabel(entry.mood)}"\n`;

  if (Object.keys(groupedActivities).length > 0) {
    frontmatter += 'activities:\n';
    for (const [groupName, items] of Object.entries(groupedActivities)) {
      frontmatter += `  ${groupName}:\n`;
      for (const item of items) {
        frontmatter += `    - ${item}\n`;
      }
    }
  }

  frontmatter += '---\n\n';

  const mdContent = frontmatter + (entry.content ?? '');
  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `Entry_${entry.date ?? 'Export'}.md`);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function exportSVGToPNG(svgElement: SVGElement, filename = 'chart.png', scale = 2): void {
  if (!svgElement) return;
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  const bbox = 'getBBox' in svgElement ? (svgElement as SVGGraphicsElement).getBBox() : null;
  const el = svgElement as unknown as HTMLElement;
  const width = Math.max(1, (bbox?.width || el.clientWidth || 800));
  const height = Math.max(1, (bbox?.height || el.clientHeight || 400));

  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(width * scale);
      canvas.height = Math.ceil(height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const png = canvas.toDataURL('image/png');
      triggerDownload(png, filename);
    } catch (e) {
      console.error('Export PNG failed:', e);
      URL.revokeObjectURL(url);
    }
  };
  img.onerror = () => {
    console.error('Failed to load SVG for PNG export');
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

export function exportDataToCSV(rows: Record<string, unknown>[], headers: string[], filename = 'data.csv'): void {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const headerRow = headers.join(',');
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const dataRows = rows.map(r => headers.map(h => escape(r[h])).join(','));
  const csv = [headerRow, ...dataRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
