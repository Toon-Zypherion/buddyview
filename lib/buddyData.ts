import path from "node:path";
import { promises as fs } from "node:fs";

type ViewsFile = {
  views?: ViewRecord[];
};

type ViewRecord = {
  id: string;
  name: string;
  buddies?: BuddyRecord[];
};

export type BuddyRecord = {
  id: string;
  name: string;
  role: string;
  status: string;
  location: {
    x: number;
    y: number;
  };
  systemInstructions: string;
  customInstructions: string;
  userInstructions: string;
  contextFile: string;
};

type BuddyDetail = BuddyRecord & {
  context: string | null;
};

const projectRoot = process.cwd();
const viewsDataPath = "data/views.json";

let buddiesCache: BuddyRecord[] | null = null;

async function loadAllBuddies(): Promise<BuddyRecord[]> {
  const views = await readViewsFile();

  return views
    .flatMap((view) => view.buddies ?? [])
    .filter(
      (entry): entry is BuddyRecord =>
        Boolean(
          entry &&
            typeof entry === "object" &&
            "id" in entry &&
            typeof entry.id === "string" &&
            entry.id.length > 0,
        ),
    );
}

async function readViewsFile(): Promise<ViewRecord[]> {
  const absolutePath = path.join(projectRoot, viewsDataPath);

  try {
    const raw = await fs.readFile(absolutePath, "utf8");
    const parsed = JSON.parse(raw) as ViewsFile;
    return parsed.views ?? [];
  } catch {
    return [];
  }
}

async function getBuddies(): Promise<BuddyRecord[]> {
  if (!buddiesCache) {
    buddiesCache = await loadAllBuddies();
  }

  return buddiesCache;
}

export async function refreshBuddyCache() {
  buddiesCache = await loadAllBuddies();
}

export async function findBuddyById(
  id: string,
): Promise<BuddyRecord | undefined> {
  const buddies = await getBuddies();
  return buddies.find((entry) => entry.id === id);
}

export async function loadBuddyDetail(id: string): Promise<BuddyDetail | null> {
  const buddy = await findBuddyById(id);

  if (!buddy) {
    return null;
  }

  const context = await readOptionalFile(buddy.contextFile);

  return {
    ...buddy,
    context,
  };
}

async function readOptionalFile(relativePath: string | null | undefined) {
  if (!relativePath) {
    return null;
  }

  const absolutePath = path.join(projectRoot, relativePath);

  try {
    return await fs.readFile(absolutePath, "utf8");
  } catch {
    return null;
  }
}
