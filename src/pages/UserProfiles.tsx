import { useState, useEffect } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import UserMetaCard from "../components/UserProfile/UserMetaCard";
import UserInfoCard from "../components/UserProfile/UserInfoCard";
import UserAddressCard from "../components/UserProfile/UserAddressCard";
import PageMeta from "../components/common/PageMeta";
import { fetchApi } from "../api/config";
import { useAuth } from "../context/AuthContext";

export type UserProfile = {
  id: number;
  email: string;
  fullName: string;
  avatarPath?: string;
  roleId?: number;
  roleName?: string;
  createdAt?: string | null;
};

export default function UserProfiles() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { refreshUser } = useAuth();

  const loadProfile = async () => {
    try {
      const res = await fetchApi("/api/users/me");
      if (!res.ok) throw new Error("Profil non chargé");
      const data = await res.json();
      setProfile(data);
      setError(null);
    } catch (e) {
      setError("Impossible de charger le profil.");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleProfileUpdated = async () => {
    await loadProfile();
    await refreshUser();
  };

  if (loading) {
    return (
      <>
        <PageMeta title="Profil | Genesis GRH" description="Votre profil utilisateur" />
        <PageBreadcrumb pageTitle="Profil" />
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-gray-500 dark:text-gray-400">Chargement du profil...</p>
        </div>
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <PageMeta title="Profil | Genesis GRH" description="Votre profil utilisateur" />
        <PageBreadcrumb pageTitle="Profil" />
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-red-500 dark:text-red-400">{error || "Profil introuvable."}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="Profil | Genesis GRH"
        description="Votre profil utilisateur"
      />
      <PageBreadcrumb pageTitle="Profil" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Mon profil
        </h3>
        <div className="space-y-6">
          <UserMetaCard profile={profile} onUpdate={handleProfileUpdated} />
          <UserInfoCard profile={profile} onUpdate={handleProfileUpdated} />
          <UserAddressCard />
        </div>
      </div>
    </>
  );
}
