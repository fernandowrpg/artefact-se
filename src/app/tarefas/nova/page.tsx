import Link from "next/link";
import { FormularioDeTarefa } from "@/components/formulario-de-tarefa";

export const metadata = { title: "Nova tarefa | Gerenciador de Tarefas" };

/**
 * Página de criação. Não há nada para pré-carregar (formulário vazio), então é
 * um Server Component leve que apenas renderiza o formulário de cliente.
 */
export default function PaginaNovaTarefa() {
  return (
    <main>
      <header className="cabecalho">
        <div>
          <h1>Nova tarefa</h1>
          <p>O título é obrigatório; a descrição é opcional.</p>
        </div>
        <Link href="/" className="botao">
          Voltar
        </Link>
      </header>

      <FormularioDeTarefa />
    </main>
  );
}
