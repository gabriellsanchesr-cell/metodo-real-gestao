/**
 * Texto dos conteúdos (Jornada e Biblioteca), com o markdown mínimo que o
 * editor do nutri aceita: títulos, lista, citação, linha e **negrito**.
 */
export function TextoConteudo({ texto }: { texto: string }) {
  return (
    <div className="prose prose-sm max-w-none text-foreground" style={{ fontSize: "16px", lineHeight: "1.7" }}>
      {texto.split("\n").map((line, i) => {
        if (line.startsWith("### ")) return <h3 key={i} className="text-base font-bold mt-4 mb-2">{negrito(line.slice(4))}</h3>;
        if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-bold mt-4 mb-2">{negrito(line.slice(3))}</h2>;
        if (line.startsWith("# ")) return <h1 key={i} className="text-xl font-bold mt-4 mb-2">{negrito(line.slice(2))}</h1>;
        if (line.startsWith("- ")) return <li key={i} className="ml-4">{negrito(line.slice(2))}</li>;
        if (line.startsWith("> ")) return <blockquote key={i} className="border-l-4 border-primary pl-3 italic text-muted-foreground my-2">{negrito(line.slice(2))}</blockquote>;
        if (line.trim() === "---") return <hr key={i} className="my-4" />;
        if (line.trim() === "") return <br key={i} />;
        return <p key={i} className="mb-2">{negrito(line)}</p>;
      })}
    </div>
  );
}

function negrito(linha: string) {
  const partes = linha.split(/\*\*(.+?)\*\*/g);
  return partes.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p));
}
