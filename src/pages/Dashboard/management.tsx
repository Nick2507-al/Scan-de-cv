import { useState, useEffect } from "react";
import { Link } from "react-router";
import { fetchApi, apiUrl } from "../../api/config";

type Candidate = {
  id: number;
  name: string;
  skills: string[];
  email: string;
  phone: string;
  dateAdded: string;
  cvUrl: string | null;
  recruiter_notes?: string;
  status?: string;
  offerId?: number | null;
};

type Offer = { id: number; title: string };

type Notes = Record<number, string>;

export default function Management() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [offerFilter, setOfferFilter] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [notes, setNotes] = useState<Notes>({});
  const [savingNote, setSavingNote] = useState(false);

  const loadCandidates = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (offerFilter) params.set("offer_id", offerFilter);
    fetchApi(`/api/candidates?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setCandidates(data.data || []);
        setTotal(data.total ?? 0);
      })
      .catch(() => { setCandidates([]); setTotal(0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCandidates();
  }, [page, limit, search, statusFilter, offerFilter]);

  useEffect(() => {
    fetchApi("/api/offers")
      .then((res) => res.json())
      .then((data) => setOffers(Array.isArray(data) ? data : []))
      .catch(() => setOffers([]));
  }, []);

  const handleNoteChange = (candidateId: number, value: string) => {
    setNotes((prev) => ({ ...prev, [candidateId]: value }));
  };

  const saveNotes = async (candidateId: number) => {
    const value = notes[candidateId] ?? selectedCandidate?.recruiter_notes ?? "";
    setSavingNote(true);
    try {
      const res = await fetchApi(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        body: JSON.stringify({ recruiter_notes: value }),
      });
      if (res.ok) {
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidateId ? { ...c, recruiter_notes: value } : c
          )
        );
        if (selectedCandidate?.id === candidateId)
          setSelectedCandidate({ ...selectedCandidate, recruiter_notes: value });
      }
    } finally {
      setSavingNote(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold dark:text-white">
        Gestion des candidats
      </h1>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Rechercher (nom, email, notes)..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="border rounded-lg px-4 py-2 w-full sm:w-64 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          >
            <option value="">Tous les statuts</option>
            <option value="Nouveau">Nouveau</option>
            <option value="Analyse OK">Analyse OK</option>
            <option value="Entretien planifié">Entretien planifié</option>
            <option value="Entretien fait">Entretien fait</option>
            <option value="Proposition">Proposition</option>
            <option value="Embauché">Embauché</option>
            <option value="Refusé">Refusé</option>
          </select>
          <select
            value={offerFilter}
            onChange={(e) => { setOfferFilter(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          >
            <option value="">Toutes les offres</option>
            {offers.map((o) => (
              <option key={o.id} value={String(o.id)}>{o.title}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
      ) : (
        <>
          <div className="overflow-x-auto border border-gray-200 rounded-lg dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nom</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Compétences</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {candidates.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{c.name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 dark:text-gray-300">
                        {c.status || "Nouveau"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {(c.skills || []).slice(0, 3).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {c.dateAdded ? new Date(c.dateAdded).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/candidates/${c.id}`} className="text-brand-500 hover:underline mr-3">Fiche</Link>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCandidate(c);
                          setNotes((prev) => ({ ...prev, [c.id]: c.recruiter_notes ?? "" }));
                        }}
                        className="text-gray-600 dark:text-gray-400 hover:underline"
                      >
                        Notes
                      </button>
                    </td>
                  </tr>
                ))}
                {candidates.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      Aucun candidat trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {total} candidat(s) — page {page} / {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 border rounded-lg disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 border rounded-lg disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {selectedCandidate && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedCandidate(null)}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedCandidate(null)}
              className="absolute top-2 right-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              aria-label="Fermer"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4 dark:text-white">{selectedCandidate.name || "Candidat"}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400"><strong>Email :</strong> {selectedCandidate.email || "—"}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400"><strong>Téléphone :</strong> {selectedCandidate.phone || "—"}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4"><strong>Compétences :</strong> {(selectedCandidate.skills || []).join(", ") || "—"}</p>
            <Link to={`/candidates/${selectedCandidate.id}`} className="text-brand-500 hover:underline block mb-4">Ouvrir la fiche complète →</Link>
            <label className="block font-semibold mb-1 dark:text-white">Notes :</label>
            <textarea
              rows={4}
              className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              value={notes[selectedCandidate.id] ?? ""}
              onChange={(e) => handleNoteChange(selectedCandidate.id, e.target.value)}
            />
            <button
              type="button"
              onClick={() => saveNotes(selectedCandidate.id)}
              disabled={savingNote}
              className="mt-2 bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600 disabled:opacity-50"
            >
              {savingNote ? "Enregistrement..." : "Enregistrer les notes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
