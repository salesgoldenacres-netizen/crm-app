import { BookOpen, FileText, Download, PlayCircle } from "lucide-react";
import EmptyState from "@/shared/components/ui/EmptyState";
import { NAV_LABELS } from "@/shared/constants/navTaxonomy";

interface ObjectionItem {
  id: string;
  title: string;
  content: string | string[];
}

interface DocumentItem {
  id: string;
  title: string;
  url: string;
}

interface VideoItem {
  id: string;
  title: string;
  url: string;
}

interface TrainingHQViewProps {
  trainingData: {
    objections?: ObjectionItem[];
    documents?: DocumentItem[];
    videos?: VideoItem[];
  } | undefined;
}

export default function TrainingHQView({ trainingData }: TrainingHQViewProps) {
  return (
    <div className="w-full max-w-full mx-auto px-3 sm:px-6 lg:px-12 py-5 sm:py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="type-page-title text-theme-text flex items-center">
            <BookOpen className="w-6 h-6 mr-3 text-theme-accent" aria-hidden="true" />
            {NAV_LABELS.training}
          </h2>
          <p className="type-secondary text-theme-muted mt-1">
            Master your pitches, overcome objections, and learn the product.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {(trainingData?.objections || []).length === 0 && (
            <EmptyState
              title="No pitches or objections yet"
              description="Admin can add them in the Training Content panel."
              icon={<BookOpen className="w-8 h-8" aria-hidden="true" />}
              className="max-w-none"
            />
          )}
          {(trainingData?.objections || []).map((obj) => (
            <div
              key={obj.id}
              className="bg-theme-card rounded-theme shadow-elevation-sm border border-theme-border overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-theme-border bg-theme-surface">
                <h3 className="type-card-title text-theme-text">{obj.title}</h3>
              </div>
              <div className="p-6 text-sm text-theme-text leading-relaxed space-y-4">
                {Array.isArray(obj.content) ? (
                  obj.content.map((p, i) => (
                    <p
                      key={i}
                      className={
                        p.startsWith("Often")
                          ? "text-theme-text"
                          : p.startsWith("Step")
                            ? "font-medium text-theme-text"
                            : "italic bg-theme-danger/10 p-3 rounded-theme border border-theme-danger/20 text-theme-text"
                      }
                    >
                      {p}
                    </p>
                  ))
                ) : (
                  <p>{obj.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="bg-theme-accent-muted border border-theme-border rounded-theme p-5">
            <h4 className="type-card-title text-theme-accent mb-3 flex items-center">
              <FileText className="w-4 h-4 mr-2" aria-hidden="true" />
              Quick Reference Docs
            </h4>
            {(trainingData?.documents || []).length === 0 ? (
              <p className="text-xs text-theme-muted">No documents uploaded yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {trainingData?.documents?.map((doc) => (
                  <li key={doc.id}>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-theme-accent hover:underline flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring rounded-theme"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" /> {doc.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-theme-card border border-theme-border rounded-theme p-5">
            <h4 className="type-card-title text-theme-text mb-3 flex items-center">
              <PlayCircle className="w-4 h-4 mr-2 text-theme-danger" aria-hidden="true" />
              Video Modules
            </h4>
            {(trainingData?.videos || []).length === 0 ? (
              <p className="text-xs text-theme-muted">No training videos uploaded yet.</p>
            ) : (
              <div className="space-y-4">
                {trainingData?.videos?.map((video) => (
                  <a
                    key={video.id}
                    href={video.url}
                    target="_blank"
                    rel="noreferrer"
                    className="relative group cursor-pointer rounded-theme overflow-hidden border border-theme-border aspect-video bg-theme-surface flex flex-col items-center justify-center hover:border-theme-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring"
                  >
                    <PlayCircle className="w-10 h-10 text-theme-muted group-hover:text-theme-accent transition-colors" aria-hidden="true" />
                    <span className="text-xs font-semibold text-theme-muted mt-2 px-2 text-center group-hover:text-theme-accent">
                      {video.title}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
