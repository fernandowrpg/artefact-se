import type { Metadata } from "next";
import Link from "next/link";
import { ProvedorDeToasts } from "@/components/toaster";
import { ProvedorTRPC } from "@/trpc/client";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gerenciador de Tarefas",
  description: "Sistema simples de gerenciamento de tarefas com Next.js 15 e tRPC.",
};

/**
 * Layout raiz. Os providers ficam aqui porque precisam envolver TODAS as rotas:
 * - `ProvedorTRPC` cria o QueryClient + cliente tRPC (é um Client Component);
 * - `ProvedorDeToasts` guarda a fila de notificações.
 *
 * Observe que o layout em si continua sendo um Server Component — ele apenas
 * renderiza componentes de cliente. Esse é o padrão do App Router: empurrar a
 * fronteira "use client" o mais para baixo possível na árvore.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ProvedorTRPC>
          <ProvedorDeToasts>
            <div className="container">
              <nav style={{ marginBottom: 20, fontSize: "0.88rem" }}>
                <Link href="/">Tarefas</Link>
              </nav>
              {children}
            </div>
          </ProvedorDeToasts>
        </ProvedorTRPC>
      </body>
    </html>
  );
}
