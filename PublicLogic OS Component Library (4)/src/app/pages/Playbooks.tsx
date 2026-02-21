import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import PageHeader from "../components/PageHeader";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";

const BUILTIN_PLAYBOOKS = [
  {
    id: "welcome",
    title: "Welcome",
    body: `# Playbooks\n\nShort, practical guides for delivery and compliance.\n\n- Intake → deliver\n- Records discipline (ARCHIEVE)\n- Town environment operations\n`,
  },
  {
    id: "prr",
    title: "PRR Basics (MA)",
    body: `# PRR (M.G.L. c. 66 §10)\n\n- Respond within **10 business days** (T10)\n- Maintain **audit trails**\n- Archive case artifacts to SharePoint\n`,
  },
] as const;

type PlaybookId = (typeof BUILTIN_PLAYBOOKS)[number]["id"];

export default function Playbooks() {
  const [active, setActive] = useState<PlaybookId>(BUILTIN_PLAYBOOKS[0].id);
  const doc = useMemo(
    () => BUILTIN_PLAYBOOKS.find((d) => d.id === active) ?? BUILTIN_PLAYBOOKS[0],
    [active],
  );

  return (
    <div>
      <PageHeader
        title="Playbooks"
        subtitle="Markdown playbooks rendered inside the portal."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-4 rounded-3xl border-slate-200 p-4 shadow-sm">
          <div className="text-xs font-black uppercase tracking-widest text-slate-500">
            Library
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {BUILTIN_PLAYBOOKS.map((d) => (
              <Button
                key={d.id}
                variant={d.id === active ? "default" : "outline"}
                className="justify-start rounded-xl"
                onClick={() => setActive(d.id)}
              >
                {d.title}
              </Button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-8 rounded-3xl border-slate-200 p-6 shadow-sm">
          <div className="prose prose-slate max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.body}</ReactMarkdown>
          </div>
        </Card>
      </div>
    </div>
  );
}
