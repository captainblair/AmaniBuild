import type { LibraryAssetType, LibraryDocumentType } from "@/lib/api/types";

export const DOCUMENT_TYPES: { value: LibraryDocumentType; label: string }[] = [
  { value: "drawing", label: "Drawing" },
  { value: "contract", label: "Contract" },
  { value: "report", label: "Report" },
  { value: "inspection", label: "Inspection" },
  { value: "receipt", label: "Receipt" },
  { value: "other", label: "Other" },
];

export const ASSET_TYPES: { value: LibraryAssetType; label: string }[] = [
  { value: "document", label: "Document" },
  { value: "photo", label: "Photo" },
];

export function documentTypeLabel(value: string): string {
  return DOCUMENT_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatLibraryDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
}

export function extensionBadge(ext: string): string {
  const clean = (ext || "").replace(/^\./, "").toUpperCase();
  return clean || "FILE";
}

export type FolderNode = {
  name: string;
  path: string;
  count: number;
  children: FolderNode[];
};

/** Build a nested folder tree from flat API folder rows. */
export function buildFolderTree(folders: { folder: string; count: number }[]): FolderNode[] {
  const root: FolderNode[] = [];

  for (const row of folders) {
    const parts = (row.folder || "Unfiled").split("/").filter(Boolean);
    let level = root;
    let pathAcc = "";

    parts.forEach((part, index) => {
      pathAcc = pathAcc ? `${pathAcc}/${part}` : part;
      let node = level.find((n) => n.name === part);
      if (!node) {
        node = { name: part, path: pathAcc, count: 0, children: [] };
        level.push(node);
      }
      if (index === parts.length - 1) {
        node.count = row.count;
      } else {
        node.count += row.count;
      }
      level = node.children;
    });
  }

  const sortNodes = (nodes: FolderNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(root);
  return root;
}
