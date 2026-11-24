import Link from "next/link";

/** Página 404 — alcançada, por exemplo, ao editar uma tarefa que já foi excluída. */
export default function NaoEncontrado() {
  return (
    <main>
      <header className="cabecalho">
        <div>
          <h1>Página não encontrada</h1>
          <p>A tarefa que você tentou abrir não existe ou já foi excluída.</p>
        </div>
      </header>
      <Link href="/" className="botao botao--primario">
        Voltar para a lista
      </Link>
    </main>
  );
}
