import React, { useState, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import { fetchApi } from "../../api/config";

type Targets = {
  objectifMensuel: number;
  analysesCeMois: number;
  aujourdhui: number;
};

// Composant Chart simplifié pour la démo
interface ChartProps {
  series: number[];
  type: string;
  height: number;
}

const Chart = ({ series, height }: ChartProps) => {
  const percentage = series[0];
  const radius = 120;
  const strokeWidth = 16;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
  
  return (
    <div className="flex items-center justify-center" style={{ height: height }}>
      <div className="relative">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90"
        >
          <circle
            stroke="#E4E7EC"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke="#465FFF"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-semibold text-gray-800 dark:text-white">
            {percentage}%
          </span>
        </div>
      </div>
    </div>
  );
};

// Composants Dropdown avec typage
interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  children: React.ReactNode;
}

const Dropdown = ({ isOpen, className, children }: DropdownProps) => {
  if (!isOpen) return null;
  
  return (
    <div className={`absolute right-0 top-8 z-10 bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
};

interface DropdownItemProps {
  onItemClick: () => void;
  className: string;
  children: React.ReactNode;
}

const DropdownItem = ({ onItemClick, className, children }: DropdownItemProps) => {
  return (
    <button
      onClick={onItemClick}
      className={`px-3 py-2 text-sm ${className}`}
    >
      {children}
    </button>
  );
};

export default function CvAnalysisProgress() {
  const [targets, setTargets] = useState<Targets | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchApi("/api/dashboard/targets")
      .then((res) => res.json())
      .then((data) => { if (!data.error) setTargets(data); })
      .catch(() => {});
  }, []);

  const objectif = targets?.objectifMensuel || 500;
  const ceMois = targets?.analysesCeMois ?? 0;
  const aujourdhui = targets?.aujourdhui ?? 0;
  const pct = objectif > 0 ? Math.round((ceMois / objectif) * 100) : 0;
  const series = [Math.min(pct, 100)];

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
      {/* En-tête avec titre et menu */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Progression Analyse CV
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Taux de traitement automatique des CV ce mois-ci
            </p>
          </div>
          <div className="relative ml-4">
            <button 
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              onClick={toggleDropdown}
            >
              <MoreHorizontal className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
            <Dropdown
              isOpen={isOpen}
              onClose={closeDropdown}
              className="w-40 p-1"
            >
              <DropdownItem
                onItemClick={closeDropdown}
                className="w-full text-left text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 rounded"
              >
                Voir détails
              </DropdownItem>
              <DropdownItem
                onItemClick={closeDropdown}
                className="w-full text-left text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 rounded"
              >
                Supprimer
              </DropdownItem>
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Zone du graphique */}
      <div className="px-6 pb-6">
        <div className="relative">
          <Chart
            series={series}
            type="radialBar"
            height={280}
          />
          
          {/* Badge de progression */}
          <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              +5% depuis le mois dernier
            </span>
          </div>
        </div>

        {/* Message motivationnel */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
            Vous avez analysé automatiquement <span className="font-medium text-gray-900 dark:text-white">{aujourdhui} CV</span> aujourd'hui. Continuez sur cette lancée !
          </p>
        </div>
      </div>

      {/* Statistiques du bas */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="px-6 py-5">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Objectif Mensuel
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {objectif} CV
              </p>
            </div>
            
            <div className="text-center border-l border-r border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                CV Analysés
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {ceMois} CV
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Aujourd'hui
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {aujourdhui} CV
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}