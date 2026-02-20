import { graphGet, graphPost, graphPatch, graphDelete } from "./graph-base";
import { getSharePointRuntimeConfig } from "../../auth/publiclogicConfig";

function encodeODataStringLiteral(s: string) {
  return String(s).replace(/'/g, "''");
}

function normalizeSitePath(sitePath: string) {
  // Graph expects a server-relative path that starts with "/".
  const trimmed = String(sitePath || "").trim();
  if (!trimmed) return "/sites/PL";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function sanitizePathSegment(s: string) {
  // SharePoint/Graph drive path constraints: avoid slashes and reserved characters.
  return String(s)
    .trim()
    .replace(/[\\/:*?"<>|#%]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120) || "untitled";
}

function encodeDrivePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

export function createSharePointClient(token: string) {
  const cfg = getSharePointRuntimeConfig();
  const cache = {
    site: null as any,
    drive: null as any,
    listsByName: new Map<string, any>(),
    listItemsCache: new Map<string, any[]>(),
    lastFetch: new Map<string, number>(),
  };

  async function getSite() {
    if (cache.site) return cache.site;
    const sitePath = normalizeSitePath(cfg.sitePath);
    const site = await graphGet(
      token,
      `/sites/${cfg.hostname}:${sitePath}`,
    );
    cache.site = site;
    return site;
  }

  async function getDefaultDrive() {
    if (cache.drive) return cache.drive;
    const site = await getSite();
    const drive = await graphGet(token, `/sites/${site.id}/drive`);
    cache.drive = drive;
    return drive;
  }

  async function findListByName(displayName: string) {
    const site = await getSite();
    const safe = encodeODataStringLiteral(displayName);
    const res = await graphGet(token, `/sites/${site.id}/lists?$filter=displayName eq '${safe}'`);
    return res?.value?.[0] || null;
  }

  async function getList(displayName: string) {
    const cached = cache.listsByName.get(displayName);
    if (cached) return cached;
    
    const list = await findListByName(displayName);
    if (!list) throw new Error(`List not found: ${displayName}`);
    
    cache.listsByName.set(displayName, list);
    return list;
  }

  async function createList({ displayName, description }: { displayName: string, description: string }) {
    const site = await getSite();
    const body = {
      displayName,
      description,
      list: { template: "genericList" }
    };
    const list = await graphPost(token, `/sites/${site.id}/lists`, body);
    cache.listsByName.set(displayName, list);
    return list;
  }

  async function createColumn(listId: string, column: any) {
    const site = await getSite();
    await graphPost(token, `/sites/${site.id}/lists/${listId}/columns`, column);
  }

  async function listColumns(displayName: string) {
    const site = await getSite();
    const list = await getList(displayName);
    const res = await graphGet(token, `/sites/${site.id}/lists/${list.id}/columns`);
    return res?.value || [];
  }

  async function ensureListWithColumns({
    displayName,
    description,
    columns,
  }: {
    displayName: string;
    description: string;
    columns: any[];
  }) {
    let list = await findListByName(displayName);
    if (!list) {
      list = await createList({ displayName, description });
    } else {
      cache.listsByName.set(displayName, list);
    }

    const existing = await listColumns(displayName);
    const existingNames = new Set(
      existing
        .map((c: any) => c?.name)
        .filter(Boolean)
        .map((s: string) => String(s).toLowerCase()),
    );

    for (const col of columns) {
      const name = String(col?.name || "").toLowerCase();
      if (!name || existingNames.has(name)) continue;
      await createColumn(list.id, col);
    }

    return list;
  }

  function invalidateListCache(displayName: string) {
    cache.listItemsCache.delete(displayName);
    cache.lastFetch.delete(displayName);
  }

  function invalidateAllCaches() {
    cache.listItemsCache.clear();
    cache.lastFetch.clear();
  }

  async function listItems(displayName: string, { selectFields, top, forceRefresh = false }: { selectFields?: string[], top?: number, forceRefresh?: boolean } = {}) {
    const site = await getSite();
    const list = await getList(displayName);

    const cacheKey = `${displayName}:${top || "all"}`;
    const lastFetch = cache.lastFetch.get(cacheKey);
    const now = Date.now();
    
    if (!forceRefresh && lastFetch && (now - lastFetch) < 5000) {
      const cached = cache.listItemsCache.get(cacheKey);
      if (cached) return cached;
    }

    let path = `/sites/${site.id}/lists/${list.id}/items?$expand=fields`;
    if (selectFields?.length) {
      const select = selectFields.map(encodeURIComponent).join(",");
      path = `/sites/${site.id}/lists/${list.id}/items?$expand=fields($select=${select})`;
    }
    if (top) path += `&$top=${top}`;

    const res = await graphGet(token, path);

    const items = (res?.value || []).map((it: any) => ({
      itemId: it.id,
      webUrl: it.webUrl,
      ...(it.fields || {})
    }));

    cache.listItemsCache.set(cacheKey, items);
    cache.lastFetch.set(cacheKey, now);

    return items;
  }

  async function queryItemsByField({
    displayName,
    fieldName,
    equals,
    top = 50,
  }: {
    displayName: string;
    fieldName: string;
    equals: string;
    top?: number;
  }) {
    const site = await getSite();
    const list = await getList(displayName);
    const safeField = String(fieldName).replace(/[^A-Za-z0-9_]/g, "");
    const safeValue = encodeODataStringLiteral(equals);

    const path = `/sites/${site.id}/lists/${list.id}/items?$expand=fields&$filter=fields/${safeField} eq '${safeValue}'&$top=${top}`;
    const res = await graphGet(token, path);
    return (res?.value || []).map((it: any) => ({
      itemId: it.id,
      webUrl: it.webUrl,
      ...(it.fields || {}),
    }));
  }

  async function createItem(displayName: string, fields: any) {
    const site = await getSite();
    const list = await getList(displayName);
    const result = await graphPost(token, `/sites/${site.id}/lists/${list.id}/items`, { fields });
    invalidateListCache(displayName);
    return result;
  }

  async function updateItemFields(displayName: string, itemId: string, fields: any) {
    const site = await getSite();
    const list = await getList(displayName);
    const result = await graphPatch(token, `/sites/${site.id}/lists/${list.id}/items/${itemId}/fields`, fields);
    invalidateListCache(displayName);
    return result;
  }

  async function deleteItem(displayName: string, itemId: string) {
    const site = await getSite();
    const list = await getList(displayName);
    const result = await graphDelete(token, `/sites/${site.id}/lists/${list.id}/items/${itemId}`);
    invalidateListCache(displayName);
    return result;
  }

  async function ensureDriveFolder(pathSegments: string[]) {
    const drive = await getDefaultDrive();
    const safeSegments = pathSegments.map(sanitizePathSegment).filter(Boolean);
    let currentPath = "";

    for (const segment of safeSegments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      try {
        // Try to resolve by path first.
        await graphGet(token, `/drives/${drive.id}/root:/${encodeDrivePath(currentPath)}`);
      } catch (e: any) {
        const msg = String(e?.message || "");
        const isNotFound = msg.includes("404") || msg.toLowerCase().includes("itemnotfound");
        if (!isNotFound) throw e;

        const parentPath = currentPath.split("/").slice(0, -1).join("/");
        const parent = parentPath
          ? await graphGet(token, `/drives/${drive.id}/root:/${encodeDrivePath(parentPath)}`)
          : await graphGet(token, `/drives/${drive.id}/root`);

        try {
          await graphPost(token, `/drives/${drive.id}/items/${parent.id}/children`, {
            name: segment,
            folder: {},
            "@microsoft.graph.conflictBehavior": "fail",
          });
        } catch (createErr: any) {
          const createMsg = String(createErr?.message || "");
          const isConflict = createMsg.includes("409") || createMsg.toLowerCase().includes("name already exists");
          if (!isConflict) throw createErr;
        }
      }
    }

    const final = safeSegments.length
      ? await graphGet(token, `/drives/${drive.id}/root:/${encodeDrivePath(safeSegments.join("/"))}`)
      : await graphGet(token, `/drives/${drive.id}/root`);

    return { driveId: drive.id as string, item: final, path: safeSegments.join("/") };
  }

  async function uploadTextFile({
    pathSegments,
    fileName,
    content,
    contentType = "text/markdown; charset=utf-8",
  }: {
    pathSegments: string[];
    fileName: string;
    content: string;
    contentType?: string;
  }) {
    const drive = await getDefaultDrive();
    const safeName = sanitizePathSegment(fileName);
    const folder = await ensureDriveFolder(pathSegments);
    const fullPath = folder.path ? `${folder.path}/${safeName}` : safeName;

    const res = await fetch(
      `https://graph.microsoft.com/v1.0/drives/${drive.id}/root:/${encodeDrivePath(fullPath)}:/content`,
      {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType,
      },
      body: content,
      },
    );

    if (!res.ok) {
      let msg = `Upload failed (${res.status})`;
      try {
        const json = await res.json();
        msg = json?.error?.message || msg;
      } catch {}
      throw new Error(msg);
    }

    return await res.json();
  }

  async function uploadSmallBytes({
    fullPath,
    bytes,
    contentType,
  }: {
    fullPath: string;
    bytes: ArrayBuffer;
    contentType: string;
  }) {
    const drive = await getDefaultDrive();
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/drives/${drive.id}/root:/${encodeDrivePath(fullPath)}:/content`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": contentType,
        },
        body: bytes,
      },
    );

    if (!res.ok) {
      let msg = `Upload failed (${res.status})`;
      try {
        const json = await res.json();
        msg = json?.error?.message || msg;
      } catch {}
      throw new Error(msg);
    }

    return await res.json();
  }

  async function uploadLargeBytesWithSession({
    fullPath,
    bytes,
    contentType,
  }: {
    fullPath: string;
    bytes: Uint8Array;
    contentType: string;
  }) {
    const drive = await getDefaultDrive();
    const session = await graphPost(
      token,
      `/drives/${drive.id}/root:/${encodeDrivePath(fullPath)}:/createUploadSession`,
      {
        item: {
          "@microsoft.graph.conflictBehavior": "replace",
          name: fullPath.split("/").pop(),
        },
      },
    );

    const uploadUrl = session?.uploadUrl;
    if (!uploadUrl) throw new Error("Upload session missing uploadUrl");

    const chunkSize = 320 * 1024; // 320 KiB (safe default)
    let offset = 0;

    while (offset < bytes.length) {
      const end = Math.min(offset + chunkSize, bytes.length);
      const chunk = bytes.slice(offset, end);
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Length": String(chunk.byteLength),
          "Content-Range": `bytes ${offset}-${end - 1}/${bytes.length}`,
          "Content-Type": contentType,
        },
        body: chunk,
      });

      if (!(res.status === 200 || res.status === 201 || res.status === 202)) {
        let msg = `Chunk upload failed (${res.status})`;
        try {
          const json = await res.json();
          msg = json?.error?.message || msg;
        } catch {}
        throw new Error(msg);
      }

      offset = end;

      if (res.status === 200 || res.status === 201) {
        // Completed; Graph returns the created driveItem.
        return await res.json();
      }
    }

    throw new Error("Upload session did not complete");
  }

  async function uploadFile({
    pathSegments,
    fileName,
    file,
  }: {
    pathSegments: string[];
    fileName: string;
    file: File;
  }) {
    const safeName = sanitizePathSegment(fileName);
    const folder = await ensureDriveFolder(pathSegments);
    const fullPath = folder.path ? `${folder.path}/${safeName}` : safeName;
    const contentType = file.type || "application/octet-stream";

    const buf = await file.arrayBuffer();
    if (buf.byteLength <= 4 * 1024 * 1024) {
      return await uploadSmallBytes({ fullPath, bytes: buf, contentType });
    }

    return await uploadLargeBytesWithSession({
      fullPath,
      bytes: new Uint8Array(buf),
      contentType,
    });
  }

  return {
    getSite,
    findListByName,
    createList,
    createColumn,
    listColumns,
    ensureListWithColumns,
    listItems,
    queryItemsByField,
    createItem,
    updateItemFields,
    deleteItem,
    getDefaultDrive,
    ensureDriveFolder,
    uploadTextFile,
    uploadFile,
    invalidateListCache,
    invalidateAllCaches
  };
}
