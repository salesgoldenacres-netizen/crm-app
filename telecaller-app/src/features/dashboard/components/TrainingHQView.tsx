import { BookOpen, FileText, Download, PlayCircle } from "lucide-react";

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
          <h2 className="text-2xl font-bold text-gray-950 dark:text-white flex items-center">
            <BookOpen className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" />
            Training HQ
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Master your pitches, overcome objections, and learn the product.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {(trainingData?.objections || []).length === 0 && (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center text-gray-500">
              No pitches or objections found. Admin can add them in the Training Content panel.
            </div>
          )}
          {(trainingData?.objections || []).map((obj) => (
            <div
              key={obj.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <h3 className="font-bold text-gray-900 dark:text-white">{obj.title}</h3>
              </div>
              <div className="p-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-4">
                {Array.isArray(obj.content) ? (
                  obj.content.map((p, i) => (
                    <p
                      key={i}
                      className={
                        p.startsWith("Often")
                          ? ""
                          : p.startsWith("Step")
                            ? "font-medium"
                            : "italic bg-rose-50 dark:bg-rose-900/20 p-3 rounded border border-rose-200 dark:border-rose-700"
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
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5">
            <h4 className="font-bold text-indigo-900 dark:text-indigo-300 mb-3 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Quick Reference Docs
            </h4>
            {(trainingData?.documents || []).length === 0 ? (
              <p className="text-xs text-gray-500">No documents uploaded yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {trainingData?.documents?.map((doc) => (
                  <li key={doc.id}>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" /> {doc.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center">
              <PlayCircle className="w-4 h-4 mr-2 text-rose-500" />
              Video Modules
            </h4>
            {(trainingData?.videos || []).length === 0 ? (
              <p className="text-xs text-gray-500">No training videos uploaded yet.</p>
            ) : (
              <div className="space-y-4">
                {trainingData?.videos?.map((video) => (
                  <a
                    key={video.id}
                    href={video.url}
                    target="_blank"
                    rel="noreferrer"
                    className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 aspect-video bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center hover:border-indigo-500 transition-colors"
                  >
                    <PlayCircle className="w-10 h-10 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    <span className="text-xs font-semibold text-gray-500 mt-2 px-2 text-center group-hover:text-indigo-500">
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
