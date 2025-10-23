import path from "node:path";
import { promises as fs } from "node:fs";
type BuddiesFile = {
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

const dataFiles = ["data/buddies.json", "data/secondchamber.json"];

let buddiesCache: BuddyRecord[] | null = null;

async function loadAllBuddies(): Promise<BuddyRecord[]> {
  const sources = await Promise.all(
    dataFiles.map(async (relativePath) => {
      const records = await readBuddiesFile(relativePath);
      return records;
    }),
  );

  return sources
    .flat()
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

async function readBuddiesFile(relativePath: string): Promise<BuddyRecord[]> {
  const absolutePath = path.join(projectRoot, relativePath);

  try {
    const raw = await fs.readFile(absolutePath, "utf8");
    const parsed = JSON.parse(raw) as BuddiesFile;
    return parsed.buddies ?? [];
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

export async function findBuddyById(id: string): Promise<BuddyRecord | undefined> {
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
