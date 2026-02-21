import { useState } from 'react'
import { EmptyState } from '../components/shared'
import type { RepoCtx, FileEntry } from '../github'
import * as gh from '../github'
import type { ToastType } from '../hooks'

export default function FilesPage({ dirEntries, filePath, setFilePath, ctx, activeBranch, toast }: {
    dirEntries: FileEntry[]
    filePath: string[]
    setFilePath: (p: string[]) => void
    ctx: RepoCtx
    activeBranch: string
    toast: (msg: string, type: ToastType) => void
}) {
    const [openFile, setOpenFile] = useState<{ path: string; content: string; sha: string } | null>(null)
    const [editContent, setEditContent] = useState('')
    const [commitMsg, setCommitMsg] = useState('')

    return (
        <section className="page-files">
            <div className="files-layout">
                <div className="breadcrumb">
                    <button type="button" onClick={() => { setFilePath([]); setOpenFile(null) }}>root</button>
                    {filePath.map((seg, i) => (
                        <button key={filePath.slice(0, i + 1).join('/')} type="button" onClick={() => { setFilePath(filePath.slice(0, i + 1)); setOpenFile(null) }}>/ {seg}</button>
                    ))}
                </div>
                {openFile ? (
                    <div className="file-editor">
                        <textarea className="editor-textarea" value={editContent} onChange={e => setEditContent(e.target.value)} />
                        <div className="editor-actions">
                            <input className="form-input" placeholder="Commit message" value={commitMsg} onChange={e => setCommitMsg(e.target.value)} />
                            <button className="button primary" type="button" onClick={async () => {
                                try {
                                    await gh.putFile(ctx, openFile.path, gh.encodeContent(editContent), commitMsg || `Update ${openFile.path}`, activeBranch, openFile.sha)
                                    toast('File saved', 'success')
                                    setOpenFile(null)
                                    setCommitMsg('')
                                } catch (e) { toast(`Failed to save file: ${e instanceof Error ? e.message : 'unknown'}`, 'error') }
                            }}>Save</button>
                            <button className="button" type="button" onClick={() => setOpenFile(null)}>Cancel</button>
                        </div>
                    </div>
                ) : dirEntries.length === 0 ? (
                    <EmptyState text="Browse files" />
                ) : (
                    <div className="file-tree">
                        {dirEntries.map(entry => (
                            <div key={entry.path} className="file-entry" onClick={async () => {
                                if (entry.type === 'dir') {
                                    setFilePath([...filePath, entry.name])
                                } else {
                                    try {
                                        const file = await gh.fetchFileContent(ctx, entry.path, activeBranch)
                                        const content = gh.decodeContent(file.content)
                                        setOpenFile({ path: file.path, content, sha: file.sha })
                                        setEditContent(content)
                                    } catch (err) { toast(`Failed to load file: ${err instanceof Error ? err.message : 'unknown'}`, 'error') }
                                }
                            }}>
                                <span className="file-icon" aria-label={entry.type === 'dir' ? 'Directory' : 'File'}>{entry.type === 'dir' ? '📁' : '📄'}</span>
                                <span className="file-name">{entry.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}
