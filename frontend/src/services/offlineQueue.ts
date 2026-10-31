// Oflayn navbat: faqat matnli murojaatlar (rasmsiz). Idempotency-Key tufayli ikki marta yuborilmaydi.
const KEY = 'offline_queue'
export interface QueueItem { token: string; key: string; payload: Record<string, any> }

export const getQueue = (): QueueItem[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
const save = (q: QueueItem[]) => localStorage.setItem(KEY, JSON.stringify(q))
export const enqueue = (i: QueueItem) => save([...getQueue(), i])

export async function flushQueue(send: (i: QueueItem) => Promise<void>) {
  const left: QueueItem[] = []
  for (const i of getQueue()) {
    try { await send(i) } catch (e: any) {
      if (!e?.response || e.response.status >= 500) left.push(i)
    }
  }
  save(left)
  return left.length
}
