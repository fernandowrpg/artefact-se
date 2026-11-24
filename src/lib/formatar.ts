/**
 * Formatação de data em pt-BR.
 *
 * Detalhe importante de SSR: se usássemos `toLocaleString()` sem fixar o
 * timeZone, o servidor (UTC) e o browser do usuário poderiam gerar strings
 * diferentes para a MESMA tarefa — e o React acusaria erro de hidratação.
 * Fixar o locale e o fuso torna o HTML do servidor idêntico ao do cliente.
 */
const formatador = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function formatarDataHora(data: Date | string): string {
  // O tRPC devolve datas como string ISO no JSON; normalizamos antes de formatar.
  const valor = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(valor.getTime())) return "—";
  return formatador.format(valor);
}
