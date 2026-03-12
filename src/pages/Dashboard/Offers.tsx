import { useState, useEffect } from "react";
import { fetchApi, apiUrl } from "../../api/config";

type Offer = {
  id: number;
  title: string;
  description: string;
  skills: string[];
  deadline: string | null;
  status: string;
  createdAt: string | null;
};

export default function Offers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [form, setForm] = useState({ title: "", description: "", skills: "", status: "ouverte" });

  const load = () => {
    setLoading(true);
    fetchApi("/api/offers")
      .then((res) => res.json())
      .then((data) => setOffers(Array.isArray(data) ? data : []))
      .catch(() => setOffers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", skills: "", status: "ouverte" });
    setModalOpen(true);
  };

  const openEdit = (o: Offer) => {
    setEditing(o);
    setForm({
      title: o.title,
      description: o.description || "",
      skills: Array.isArray(o.skills) ? o.skills.join(", ") : "",
      status: o.status || "ouverte",
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    const skills = form.skills.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const payload = {
      title: form.title.trim(),
      description: form.description,
      skills,
      status: form.status,
    };
    try {
      if (editing) {
        await fetchApi(`/api/offers/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi("/api/offers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setModalOpen(false);
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Supprimer cette offre ?")) return;
    try {
      await fetchApi(`/api/offers/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold dark:text-white">Offres de postes</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
        >
          Nouvelle offre
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Titre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Compétences</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {offers.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{o.title}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded ${o.status === "ouverte" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 dark:bg-gray-700 dark:text-gray-300"}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {Array.isArray(o.skills) ? o.skills.slice(0, 3).join(", ") : ""}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(o)} className="text-brand-500 hover:underline mr-3">Modifier</button>
                    <button onClick={() => remove(o.id)} className="text-red-500 hover:underline">Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {offers.length === 0 && (
            <p className="p-6 text-center text-gray-500 dark:text-gray-400">Aucune offre. Créez-en une.</p>
          )}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModalOpen(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4 dark:text-white">{editing ? "Modifier l'offre" : "Nouvelle offre"}</h2>
            <div className="space-y-3">
              <label className="block text-sm font-medium dark:text-gray-300">Titre *</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                placeholder="Ex: Développeur React"
              />
              <label className="block text-sm font-medium dark:text-gray-300">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                rows={3}
              />
              <label className="block text-sm font-medium dark:text-gray-300">Compétences (séparées par des virgules)</label>
              <input
                value={form.skills}
                onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                placeholder="React, Node.js, TypeScript"
              />
              <label className="block text-sm font-medium dark:text-gray-300">Statut</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              >
                <option value="ouverte">Ouverte</option>
                <option value="pourvue">Pourvue</option>
                <option value="annulee">Annulée</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 border rounded-lg dark:border-gray-600 dark:text-gray-300">Annuler</button>
              <button onClick={save} className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
