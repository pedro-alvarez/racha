/**
 * ExpenseModalContext - abre o modal de detalhes de uma despesa a partir
 * de qualquer tela: const { openExpense } = useExpenseModal().
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import ExpenseModal from '../components/ExpenseModal';

const Ctx = createContext(null);

export function ExpenseModalProvider({ children }) {
  const [expense, setExpense] = useState(null);

  const openExpense = useCallback((e) => setExpense(e), []);
  const close = useCallback(() => setExpense(null), []);

  const value = useMemo(() => ({ openExpense }), [openExpense]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {expense && <ExpenseModal expense={expense} onClose={close} />}
    </Ctx.Provider>
  );
}

export function useExpenseModal() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useExpenseModal precisa estar dentro de <ExpenseModalProvider>');
  return ctx;
}
