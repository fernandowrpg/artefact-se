"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Sistema mínimo de notificações (toasts).
 *
 * Decisão: implementado à mão em ~60 linhas em vez de instalar uma lib de toast.
 * O requisito é "feedback visual de sucesso/erro" — um Context com uma lista e
 * um timeout resolve, e evita trazer uma dependência inteira para isso.
 */

type TipoDeToast = "sucesso" | "erro";
type Toast = { id: number; tipo: TipoDeToast; mensagem: string };

type ContextoDeToast = {
  mostrarSucesso: (mensagem: string) => void;
  mostrarErro: (mensagem: string) => void;
};

const Contexto = createContext<ContextoDeToast | null>(null);

export function ProvedorDeToasts({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remover = useCallback((id: number) => {
    setToasts((atuais) => atuais.filter((toast) => toast.id !== id));
  }, []);

  const adicionar = useCallback(
    (tipo: TipoDeToast, mensagem: string) => {
      // `Date.now()` + random evita colisão de id quando dois toasts nascem no mesmo ms.
      const id = Date.now() + Math.random();
      setToasts((atuais) => [...atuais, { id, tipo, mensagem }]);
      // Erro fica mais tempo na tela: o usuário precisa ler o motivo da falha.
      setTimeout(() => remover(id), tipo === "erro" ? 6000 : 3500);
    },
    [remover],
  );

  // `useMemo` para o valor do context não trocar de identidade a cada render.
  const valor = useMemo<ContextoDeToast>(
    () => ({
      mostrarSucesso: (mensagem) => adicionar("sucesso", mensagem),
      mostrarErro: (mensagem) => adicionar("erro", mensagem),
    }),
    [adicionar],
  );

  return (
    <Contexto.Provider value={valor}>
      {children}
      {/*
        `aria-live="polite"` faz leitores de tela anunciarem o resultado da ação
        sem interromper o que está sendo lido — feedback acessível, não só visual.
      */}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tipo}`}>
            <span>{toast.mensagem}</span>
            <button type="button" onClick={() => remover(toast.id)} aria-label="Fechar aviso">
              ×
            </button>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export function useToasts() {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error("useToasts precisa ser usado dentro de <ProvedorDeToasts>.");
  }
  return contexto;
}
