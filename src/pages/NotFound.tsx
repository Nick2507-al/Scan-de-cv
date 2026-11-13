import { Link } from "react-router";
import { Compass, SearchX, FileQuestion } from "lucide-react";
import { Backdrop, Empty } from "../components/ui";

export default function NotFound() {
  return (
    <>
      <Backdrop icons={[Compass, SearchX, FileQuestion]} />
      <div className="card">
        <Empty icon={SearchX} title="Cette page n'existe pas">
          <p>L'adresse est peut-être incomplète, ou la page a été déplacée.</p>
          <Link className="btn sm" to="/">Retour au tableau de bord</Link>
        </Empty>
      </div>
    </>
  );
}
