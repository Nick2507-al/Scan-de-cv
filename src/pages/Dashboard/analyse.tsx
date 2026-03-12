import React, { useState } from "react";
import {
  Upload,
  Mail,
  Phone,
  Award,
  User,
  Building2,
  FileCheck,
  FileX2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from "lucide-react";
import { apiUrl, getStoredToken } from "../../api/config";

type AnalysisResult = {
  filename: string;
  error?: string;
  emails?: string[];
  phones?: string[];
  skills?: string[];
  persons?: string[];
  organizations?: string[];
  retained?: boolean;
  improvement_notes?: string[];
};

type Offer = { id: number; title: string };

export default function Analyse() {
  const [criteria, setCriteria] = useState({
    skills: "",
    minAge: "",
    other: "",
  });
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRejected, setExpandedRejected] = useState<Record<number, boolean>>({});

  React.useEffect(() => {
    fetch(apiUrl("/api/offers"), {
      headers: getStoredToken() ? { Authorization: `Bearer ${getStoredToken()}` } : {},
    })
      .then((r) => r.json())
      .then((data) => setOffers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const uploaded = Array.from(e.dataTransfer.files).filter(
      (f) => f.name.endsWith(".pdf") || f.name.endsWith(".docx")
    );
    setFiles((prev) => [...prev, ...uploaded]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const uploaded = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...uploaded]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyse = async () => {
    if (files.length === 0) {
      setError("Veuillez uploader au moins un fichier (PDF ou DOCX).");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setAnalysisDone(false);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("file", file));
      formData.append("criteria", JSON.stringify(criteria));
      if (selectedOfferId) formData.append("offer_id", selectedOfferId);

      const token = getStoredToken();
      const response = await fetch(apiUrl("/api/analyze"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erreur serveur : ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data.results || []);
      setAnalysisDone(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors de l'analyse. Vérifiez que le service d'analyse est démarré.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const retained = results.filter((r) => !r.error && r.retained === true);
  const rejected = results.filter((r) => !r.error && r.retained === false);
  const withError = results.filter((r) => r.error);

  const toggleRejected = (i: number) => {
    setExpandedRejected((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        Analyse de CV
      </h1>

      {/* Critères */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Critères de sélection
        </h2>
        {offers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lier à une offre (optionnel)</label>
            <select
              value={selectedOfferId}
              onChange={(e) => setSelectedOfferId(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-700 dark:text-white"
            >
              <option value="">— Aucune —</option>
              {offers.map((o) => (
                <option key={o.id} value={String(o.id)}>{o.title}</option>
              ))}
            </select>
          </div>
        )}
        <input
          type="text"
          placeholder="Compétences requises (ex: React, Node.js, Python)"
          value={criteria.skills}
          onChange={(e) => setCriteria({ ...criteria, skills: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="number"
          placeholder="Âge minimum (optionnel)"
          value={criteria.minAge}
          onChange={(e) => setCriteria({ ...criteria, minAge: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <textarea
          placeholder="Autres critères (optionnel)"
          value={criteria.other}
          onChange={(e) => setCriteria({ ...criteria, other: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={2}
        />
      </div>

      {/* Upload */}
      <div
        className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border-2 border-dashed border-gray-300 dark:border-gray-600 text-center"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        <Upload className="mx-auto text-gray-400 dark:text-gray-500" size={44} />
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Glissez-déposez vos CV ici ou sélectionnez des fichiers (PDF, DOCX)
        </p>
        <input
          type="file"
          multiple
          accept=".pdf,.docx"
          onChange={handleFileSelect}
          className="mt-3 text-gray-900 dark:text-white text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300 file:font-medium"
        />
        {files.length > 0 && (
          <ul className="mt-4 text-left space-y-1 max-h-40 overflow-y-auto">
            {files.map((f, i) => (
              <li
                key={i}
                className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 rounded-lg px-3 py-2"
              >
                <span className="truncate">📄 {f.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(i)}
                  className="text-red-500 hover:text-red-600 ml-2 shrink-0"
                  aria-label="Retirer"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bouton analyser */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={handleAnalyse}
          disabled={loading}
          className={`px-6 py-3 rounded-lg font-medium text-white transition ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 shadow-sm"
          }`}
        >
          {loading ? "Analyse en cours..." : "Lancer l'analyse"}
        </button>
        {error && (
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        )}
      </div>

      {/* Résultats */}
      {analysisDone && results.length > 0 && (
        <div className="space-y-10">
          {/* CV retenus */}
          {retained.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white mb-4">
                <FileCheck className="text-green-600 dark:text-green-400" size={24} />
                CV retenus ({retained.length})
              </h2>
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {retained.map((r, idx) => (
                  <article
                    key={idx}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition"
                  >
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-br from-green-50 to-white dark:from-gray-800 dark:to-gray-800">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                          <User className="text-green-600 dark:text-green-400" size={24} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {r.persons?.length
                              ? r.persons.slice(0, 2).join(" ")
                              : "Candidat"}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {r.filename}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      {(r.emails?.length || r.phones?.length) > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {r.emails?.slice(0, 1).map((e, i) => (
                            <a
                              key={i}
                              href={`mailto:${e}`}
                              className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <Mail size={14} /> {e}
                            </a>
                          ))}
                          {r.phones?.slice(0, 1).map((p, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300"
                            >
                              <Phone size={14} /> {p}
                            </span>
                          ))}
                        </div>
                      )}
                      {r.skills && r.skills.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                            <Award size={12} /> Compétences
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {r.skills.map((s, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs font-medium"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {r.organizations && r.organizations.length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Building2 size={12} />
                          {r.organizations.slice(0, 2).join(", ")}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* CV non retenus + notes d'amélioration */}
          {rejected.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white mb-4">
                <FileX2 className="text-amber-600 dark:text-amber-400" size={24} />
                CV non retenus – Notes d'amélioration ({rejected.length})
              </h2>
              <div className="space-y-4">
                {rejected.map((r, idx) => {
                  const isExpanded = expandedRejected[idx] !== false;
                  return (
                    <article
                      key={idx}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-amber-200 dark:border-amber-900/50 overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleRejected(idx)}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                            <FileX2 className="text-amber-600 dark:text-amber-400" size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {r.persons?.length
                                ? r.persons.slice(0, 2).join(" ")
                                : "Candidat"}
                              {" · "}
                              <span className="text-gray-500 dark:text-gray-400 font-normal">
                                {r.filename}
                              </span>
                            </p>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                              Pourquoi ce CV n'a pas été retenu et quoi améliorer
                            </p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="text-gray-400 shrink-0" size={20} />
                        ) : (
                          <ChevronDown className="text-gray-400 shrink-0" size={20} />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-0 border-t border-gray-100 dark:border-gray-700">
                          <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50">
                            <h4 className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200 mb-3">
                              <Lightbulb size={18} />
                              Recommandations pour améliorer ce CV
                            </h4>
                            <ul className="space-y-2">
                              {r.improvement_notes?.map((note, i) => (
                                <li
                                  key={i}
                                  className="flex gap-2 text-sm text-amber-900 dark:text-amber-100"
                                >
                                  <span className="text-amber-500 mt-0.5">•</span>
                                  <span>{note}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          {(r.emails?.length || r.phones?.length || r.skills?.length) > 0 && (
                            <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                              {r.emails?.length ? (
                                <span className="flex items-center gap-1">
                                  <Mail size={14} /> {r.emails[0]}
                                </span>
                              ) : null}
                              {r.phones?.length ? (
                                <span className="flex items-center gap-1">
                                  <Phone size={14} /> {r.phones[0]}
                                </span>
                              ) : null}
                              {r.skills?.length ? (
                                <span className="flex items-center gap-1">
                                  <Award size={14} /> {r.skills.join(", ")}
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Erreurs (fichiers non analysables) */}
          {withError.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Fichiers en erreur
              </h2>
              <ul className="space-y-2">
                {withError.map((r, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2"
                  >
                    <strong>{r.filename}</strong> — {r.error}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {retained.length === 0 && rejected.length === 0 && withError.length === 0 && (
            <p className="text-gray-600 dark:text-gray-400">
              Aucun résultat à afficher.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
