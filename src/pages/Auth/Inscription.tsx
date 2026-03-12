import { useState } from "react";
import { Link, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import AuthLayoutGenesis from "../../layout/AuthLayoutGenesis";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { useAuth } from "../../context/AuthContext";
import { Eye, EyeOff } from "lucide-react";

export default function Inscription() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    const result = await register(email, password, fullName.trim() || undefined);
    if (result.ok) {
      navigate("/", { replace: true });
    } else {
      setError(result.error || "Erreur lors de l'inscription");
    }
  };

  return (
    <>
      <PageMeta
        title="Inscription | Genesis GRH"
        description="Créez votre compte Genesis GRH"
      />
      <AuthLayoutGenesis title="Créer un compte">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
            >
              {error}
            </div>
          )}
          <div>
            <Label htmlFor="fullName">Nom complet</Label>
            <Input
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder="Jean Dupont"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email">
              Adresse email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="vous@entreprise.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password">
              Mot de passe <span className="text-red-500">*</span>
            </Label>
            <div className="relative mt-1">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Au moins 6 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="confirmPassword">
              Confirmer le mot de passe <span className="text-red-500">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Répétez le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            size="sm"
            disabled={loading}
          >
            {loading ? "Création du compte..." : "S'inscrire"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Déjà un compte ?{" "}
          <Link
            to="/connexion"
            className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            Se connecter
          </Link>
        </p>
      </AuthLayoutGenesis>
    </>
  );
}
