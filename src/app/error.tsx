"use client";

/**
 * Error boundary da rota (convenção `error.tsx` do App Router).
 * Qualquer exceção não tratada no render cai aqui em vez de quebrar a tela toda,
 * e o usuário recebe um botão para tentar novamente.
 */
export default function ErroDaPagina({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main>
      <div className="aviso aviso--erro" role="alert">
        <strong>Algo deu errado.</strong>
        <p style={{ margin: "6px 0 0" }}>{error.message}</p>
      </div>
      <button type="button" className="botao botao--primario" style={{ marginTop: 16 }} onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
