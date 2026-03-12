import { useState } from "react";
import { Link, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import AuthLayoutGenesis from "../../layout/AuthLayoutGenesis";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { useAuth } from "../../context/AuthContext";
import { Eye, EyeOff } from "lucide-react";

export default function Connexion() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = await login(email, password);
    if (result.ok) {
      navigate("/", { replace: true });
    } else {
      setError(result.error || "Identifiants incorrects");
    }
  };

  return (
    <>
      <PageMeta
        title="Connexion | Genesis GRH"
        description="Connectez-vous à votre espace Genesis GRH"
      />
      <AuthLayoutGenesis title="Connexion à votre espace">
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
                autoComplete="current-password"
                placeholder="••••••••"
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
          <Button
            type="submit"
            className="w-full"
            size="sm"
            disabled={loading}
          >
            {loading ? "Connexion en cours..." : "Se connecter"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Pas encore de compte ?{" "}
          <Link
            to="/inscription"
            className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
          >
            Créer un compte
          </Link>
        </p>
      </AuthLayoutGenesis>
    </>
  );
}
