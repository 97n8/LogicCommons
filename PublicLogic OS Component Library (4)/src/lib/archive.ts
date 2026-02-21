/**
 * Phillipston Vault - Archive-First Workflow
 * M.G.L. c. 66 compliance archival logic
 */

/**
 * Get current/next fiscal year folder name (Massachusetts FY starts July 1)
 */
export function getFiscalYearFolder() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startYear = month >= 7 ? year : year - 1;
  return `FY${startYear}-${startYear + 1}`;
}

/**
 * Recursively ensure folder path exists
 */
async function ensureFolderPath(sp: any, sitePath: string, listName: string, segments: string[]) {
  let current = `${sitePath}/${listName}`;
  for (const segment of segments) {
    current += `/${segment}`;
    try {
      await sp.web.getFolderByServerRelativeUrl(current).select('Exists')();
    } catch (err: any) {
      if (err.status === 404) {
        await sp.web.folders.addUsingPath(current);
        console.log(`Created folder: ${current}`);
      } else {
        throw err;
      }
    }
  }
  return current;
}

/**
 * Ensure ARCHIEVE list exists + create Phillipston folder structure
 */
export async function ensureArchieveList(sp: any, cfg: any) {
  const sitePath = cfg.sharepoint.sitePath || '/sites/PL';
  const listName = cfg.sharepoint.archieve?.listName || 'ARCHIEVE';

  let listId;
  try {
    const list = await sp.web.lists.getByTitle(listName).select('Id')();
    listId = list.Id;
  } catch (err: any) {
    if (err.status !== 404) throw err;

    const newList = await sp.web.lists.add({
      Title: listName,
      Description: 'Phillipston Vault ARCHIEVE – M.G.L. c.66 compliant records',
      TemplateType: 100,
      EnableVersioning: true,
      ContentTypesEnabled: true,
    });

    listId = newList.data.Id;

    // Add fields
    await Promise.all([
      sp.web.lists.getByTitle(listName).fields.addText('RecordType', { Required: true }),
      sp.web.lists.getByTitle(listName).fields.addDateTime('RecordDate', { Required: true }),
      sp.web.lists.getByTitle(listName).fields.addMultilineText('Content', { RichText: true, Required: true }),
      sp.web.lists.getByTitle(listName).fields.addText('Tags', {}),
      sp.web.lists.getByTitle(listName).fields.addChoice('RetentionClass', {
        Choices: ['Permanent', 'Reference_7y', 'Transactional_1y', 'Transactional_2y'],
        Required: true,
      }),
      sp.web.lists.getByTitle(listName).fields.addBoolean('Locked', { DefaultValue: true }),
      sp.web.lists.getByTitle(listName).fields.addDateTime('RetentionEndDate', {}),
    ]);
  }

  // Auto-create Phillipston PRR folder structure
  const fy = getFiscalYearFolder();
  const folderPath = await ensureFolderPath(sp, sitePath, listName, [fy, "PHILLIPSTON", "PRR"]);

  return { listId, folderPath };
}

/**
 * Save PRR form submission to ARCHIEVE list + dedicated folder
 */
export async function savePrrSubmission(sp: any, cfg: any, formData: any) {
  const listName = cfg.sharepoint.archieve?.listName || 'ARCHIEVE';
  const sitePath = cfg.sharepoint.sitePath || '/sites/PL';
  const fy = getFiscalYearFolder();
  const folderPath = `${sitePath}/${listName}/${fy}/PHILLIPSTON/PRR`;

  // Ensure folder exists
  await ensureFolderPath(sp, sitePath, listName, [fy, "PHILLIPSTON", "PRR"]);

  // Generate filename
  const date = new Date().toISOString().split('T')[0] ?? "";
  const slug = (formData.request || 'request').slice(0, 30).toLowerCase().replace(/[^a-z0-9]/g, '-');
  const filename = `PRR_${date}_${slug}.md`;

  // Markdown content
  const markdown = `# Phillipston Public Records Request\n\n` +
    `**Submitted:** ${new Date().toLocaleString()}\n` +
    `**Requester:** ${formData.name} <${formData.email}> ${formData.phone ? `(${formData.phone})` : ''}\n\n` +
    `**Request:**\n${formData.request}\n\n` +
    `---\n\n**Status:** Received\n**T10 Deadline:** ${new Date(Date.now() + 10*24*60*60*1000).toLocaleDateString()}\n` +
    `**Law:** M.G.L. c. 66 §10 & 950 CMR 32.00`;

  // Upload file
  const file = await sp.web.getFolderByServerRelativeUrl(folderPath).files.addUsingPath(filename, markdown, true);

  // Add metadata to ARCHIEVE list
  const listItem = await sp.web.lists.getByTitle(listName).items.add({
    Title: `PRR - ${formData.name} - ${date}`,
    RecordType: 'Public Records Request',
    RecordDate: new Date().toISOString(),
    Content: formData.request,
    Tags: 'Phillipston,PRR,MGL c.66',
    RetentionClass: 'Permanent',
  });

  return {
    itemId: listItem.data.Id,
    fileUrl: file.data.ServerRelativeUrl,
    filename,
    caseId: `PRR-${date.replace(/-/g, '')}-${listItem.data.Id.toString().padStart(4, '0')}`,
  };
}
