export interface NetworkConfig {
  schools: string[];
  backup?: string;
}

declare global {
  interface Window {
    NET?: NetworkConfig;
  }
  const NET: NetworkConfig | undefined;
}

const DEFAULT_NET: NetworkConfig = {
  schools: ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  backup: 'http://localhost:3100',
};

export const SCHOOL_NAMES = ['Đại học A', 'Đại học B', 'Đại học C'] as const;

export function getNetworkConfig(): NetworkConfig {
  if (typeof window !== 'undefined' && window.NET && Array.isArray(window.NET.schools)) {
    return window.NET;
  }
  try {
    if (typeof NET !== 'undefined' && NET && Array.isArray(NET.schools)) {
      return NET;
    }
  } catch {
    // ignore
  }
  return DEFAULT_NET;
}

export interface NodeDescriptor {
  id: string;
  url: string;
  label: string;
  shortLabel: string;
  isBackup: boolean;
  schoolIndex?: number;
}

export function getAllNodes(): NodeDescriptor[] {
  const net = getNetworkConfig();
  const list: NodeDescriptor[] = net.schools.map((url, idx) => ({
    id: `node-${idx + 1}`,
    url,
    label: `Node ${idx + 1} · ${SCHOOL_NAMES[idx] || `Trường ${idx + 1}`}`,
    shortLabel: SCHOOL_NAMES[idx] || `Node ${idx + 1}`,
    isBackup: false,
    schoolIndex: idx,
  }));
  if (net.backup) {
    list.push({
      id: 'backup',
      url: net.backup,
      label: 'Backup VPS · Bản sao dự phòng',
      shortLabel: 'Backup VPS',
      isBackup: true,
    });
  }
  return list;
}
