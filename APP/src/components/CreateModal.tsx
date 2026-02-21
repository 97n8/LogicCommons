export default function CreateModal({ onClose }: { onClose: () => void }) {
    const options = ['Issue', 'Pull Request', 'Branch', 'Label', 'File', 'Environment', 'Variable', 'Workflow', 'Repository']
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create</h2>
                    <button type="button" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    {options.map(o => (
                        <button key={o} className="modal-option" type="button">{o}</button>
                    ))}
                </div>
            </div>
        </div>
    )
}
