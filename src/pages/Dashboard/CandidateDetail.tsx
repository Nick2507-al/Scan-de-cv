import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { fetchApi } from "../../api/config";
import { ArrowLeft, Mail, Phone, Briefcase, FileText, Download } from "lucide-react";

type Candidate = {
  id: number;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  organizations: string[];
  filename: string;
  retained: boolean;
  improvement_notes: string[];
  recruiter_notes: string;
  dateAdded: string;
  status: string;
  offerId: number | null;
  cvUrl: string | null;
  history?: { oldStatus: string; newStatus: string; comment: string; createdAt: string | null; userFullName: string }[];
};

const STATUS_OPTIONS = ["Nouveau", "Analyse OK", "Entretien planifié", "Entretien fait", "Proposition", "Embauché", "Refusé"];

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [recruiterNotes, setRecruiterNotes] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchApi(`/api/candidates/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setCandidate(data);
        setRecruiterNotes(data.recruiter_notes ?? "");
        setStatus(data.status ?? "Nouveau");
      })
      .catch(() => setCandidate(null))
      .finally(() => setLoading(false));
  }, [id]);

  const saveNotes = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await fetchApi(`/api/candidates/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ recruiter_notes: recruiterNotes }),
      });
      if (candidate) setCandidate({ ...candidate, recruiter_notes: recruiterNotes });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!id) return;
    setSaving(true);
    try {
      await fetchApi(`/api/candidates/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setStatus(newStatus);
      if (candidate) setCandidate({ ...candidate, status: newStatus });
      // Recharger pour avoir l'historique à jour
      const res = await fetchApi(`/api/candidates/${id}`);
      const data = await res.json();
      if (data.history) setCandidate((c) => c ? { ...c, history: data.history } : null);
    } finally {
      setSaving(false);
    }
  };

  const downloadCv = async () => {
    if (!id) return;
    try {
      const res = await fetchApi(`/api/candidates/${id}/file`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = candidate?.filename || "cv.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-6">Chargement...</div>;
  if (!candidate) return <div className="p-6">Candidat introuvable. <Link to="/management" className="text-brand-500">Retour à la liste</Link></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/management" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold dark:text-white">Fiche candidat</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Identité</h2>
            <p className="text-gray-900 dark:text-white font-medium">{candidate.name || "—"}</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              {candidate.email && (
                <span className="flex items-center gap-1"><Mail className="size-4" /> {candidate.email}</span>
              )}
              {candidate.phone && (
                <span className="flex items-center gap-1"><Phone className="size-4" /> {candidate.phone}</span>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-500">Ajouté le {candidate.dateAdded}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4 dark:text-white flex items-center gap-2"><Briefcase className="size-5" /> Compétences</h2>
            <div className="flex flex-wrap gap-2">
              {(candidate.skills || []).map((s, i) => (
                <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">{s}</span>
              ))}
              {(candidate.skills || []).length === 0 && <span className="text-gray-500">—</span>}
            </div>
            {(candidate.organizations || []).length > 0 && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">Organisations : {(candidate.organizations || []).join(", ")}</p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4 dark:text-white flex items-center gap-2"><FileText className="size-5" /> Notes recruteur</h2>
            <textarea
              value={recruiterNotes}
              onChange={(e) => setRecruiterNotes(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
              rows={4}
              placeholder="Notes libres..."
            />
            <button onClick={saveNotes} disabled={saving} className="mt-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>

          {!candidate.retained && (candidate.improvement_notes || []).length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-6">
              <h2 className="text-lg font-semibold mb-2 text-amber-800 dark:text-amber-200">Points d'amélioration (CV non retenu)</h2>
              <ul className="list-disc list-inside text-sm text-amber-700 dark:text-amber-300 space-y-1">
                {candidate.improvement_notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">Statut</h2>
            <select
              value={status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={saving}
              className="w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {candidate.cvUrl && (
              <button onClick={downloadCv} className="mt-4 flex items-center gap-2 w-full justify-center px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600">
                <Download className="size-4" /> Télécharger le CV
              </button>
            )}
          </div>

          {(candidate.history || []).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">Historique</h2>
              <ul className="space-y-2 text-sm">
                {candidate.history.map((h, i) => (
                  <li key={i} className="border-l-2 border-gray-200 dark:border-gray-600 pl-3 py-1">
                    <span className="text-gray-600 dark:text-gray-400">{h.oldStatus} → {h.newStatus}</span>
                    {h.userFullName && <span className="text-gray-500 ml-1">({h.userFullName})</span>}
                    {h.createdAt && <span className="block text-gray-400 text-xs">{new Date(h.createdAt).toLocaleString()}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
