import { useNavigate, useLocation } from "react-router-dom";

const LINKS = [
  { label: "Synthèse", path: "/synthese", filtre: null },
];

export default function RecouvrementNav({ residenceId }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (link) =>
    location.pathname === link.path;

  const go = (link) => {
    const qs = new URLSearchParams();
    if (residenceId) qs.set("residence", residenceId);
    if (link.filtre)  qs.set("filtre", link.filtre);
    navigate(`${link.path}?${qs.toString()}`);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap mb-4">
      {LINKS.map((link) => (
        <button
          key={link.label}
          onClick={() => go(link)}
          className={[
            "text-xs px-3 py-1.5 rounded-xl font-medium transition border",
            isActive(link)
              ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
              : "bg-white border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600",
          ].join(" ")}
        >
          {link.label}
        </button>
      ))}
    </div>
  );
}
