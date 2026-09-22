const GUID_PATTERN = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

export function extractFabricId(resourceKey: string, locator: string): string | undefined {
  const trimmed = locator.trim();
  const exactGuid = new RegExp(`^${GUID_PATTERN}$`);
  if (exactGuid.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const pathname = decodeURIComponent(url.pathname);

    if (resourceKey === "workspace") {
      const workspaceMatch = pathname.match(new RegExp(`/groups/(${GUID_PATTERN})(?:/|$)`, "i"));
      return workspaceMatch?.[1];
    }

    const matches = pathname.match(new RegExp(GUID_PATTERN, "g"));
    return matches?.at(-1);
  } catch {
    const match = trimmed.match(new RegExp(GUID_PATTERN, "i"));
    return match?.[0];
  }
}
