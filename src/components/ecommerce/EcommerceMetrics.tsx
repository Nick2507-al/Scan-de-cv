import { useEffect, useState } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BoxIconLine,
  GroupIcon,
} from "../../icons";
import Badge from "../ui/badge/Badge";
import { fetchApi } from "../../api/config";

type Metrics = {
  cvAnalyses: number;
  cvAnalysesEvolution: number;
  enAttente: number;
  enAttenteEvolution: number;
};

export default function CvMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi("/api/dashboard/metrics")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setMetrics(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 animate-pulse">
          <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="mt-5 h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="mt-2 h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 animate-pulse">
          <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="mt-5 h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="mt-2 h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  const cv = metrics?.cvAnalyses ?? 0;
  const ev1 = metrics?.cvAnalysesEvolution ?? 0;
  const att = metrics?.enAttente ?? 0;
  const ev2 = metrics?.enAttenteEvolution ?? 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              CV Analysés
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {cv}
            </h4>
          </div>
          <Badge color="success">
            <ArrowUpIcon />
            {ev1}%
          </Badge>
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <BoxIconLine className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              En attente
            </span>
            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
              {att}
            </h4>
          </div>
          <Badge color="warning">
            <ArrowDownIcon />
            {ev2}%
          </Badge>
        </div>
      </div>
    </div>
  );
}