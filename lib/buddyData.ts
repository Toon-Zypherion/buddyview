import path from "node:path";
import { promises as fs } from "node:fs";
import primaryRaw from "@/data/buddies.json";
import secondaryRaw from "@/data/secondchamber.json";

type BuddiesFile = {
  buddies: BuddyRecord[];
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

const buddiesData = primaryRaw as BuddiesFile;
const secondChamberData = (secondaryRaw as Partial<BuddiesFile>) ?? {};

const buddiesSources = [
  buddiesData.buddies ?? [],
  secondChamberData.buddies ?? [],
];

const buddies = buddiesSources
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

const projectRoot = process.cwd();

export function findBuddyById(id: string): BuddyRecord | undefined {
  return buddies.find((entry) => entry.id === id);
}

export async function loadBuddyDetail(id: string): Promise<BuddyDetail | null> {
  const buddy = findBuddyById(id);

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
