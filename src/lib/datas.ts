/**
 * Datas do banco sem hora ("AAAA-MM-DD", colunas `date`).
 *
 * `new Date("2026-10-05")` é meia-noite em UTC, que no Brasil ainda é dia 4:
 * a tela mostrava a data um dia antes. E `toISOString().slice(0, 10)` dá o
 * dia em UTC, que depois das 21h já é amanhã. Use estas funções.
 */
import { format, parseISO } from "date-fns";

/** "2026-10-05" como meia-noite local. Também aceita data com hora. */
export function dataLocal(valor: string | Date): Date {
  return valor instanceof Date ? valor : parseISO(valor);
}

/** Data local como "AAAA-MM-DD", para gravar em coluna `date`. */
export function isoLocal(d: Date = new Date()): string {
  return format(d, "yyyy-MM-dd");
}
