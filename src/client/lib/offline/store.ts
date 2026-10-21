import type { Card, ReviewInput } from '@shared/schemas';

// Raw IndexedDB: two stores and a handful of calls don't earn a wrapper dependency.

/**
 * A graded review that has not reached the server yet. `heldBy` marks a session's last grade,
 * which that page can still undo; it holds the id of the page load that may undo it.
 */
export type PendingReview = ReviewInput & { userId: string; heldBy?: string };

/** The last due list `/api/cards/due` gave this user (L-106: never recomputed here). */
type DueEntry = { userId: string; cards: Card[] };

const DB_NAME = 'frenchy-offline';
const PENDING = 'pendingReviews';
const DUE = 'dueCards';

let opening: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(PENDING, { keyPath: ['userId', 'id'] });
      request.result.createObjectStore(DUE, { keyPath: 'userId' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB failed to open'));
  }).catch((error: unknown) => {
    opening = null;
    throw error;
  });
  return opening;
}

function finished(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
  });
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

async function write(stores: string[], work: (tx: IDBTransaction) => void | Promise<void>) {
  const tx = (await openDb()).transaction(stores, 'readwrite');
  const done = finished(tx);
  await work(tx);
  await done;
}

export async function putPending(review: PendingReview): Promise<void> {
  await write([PENDING], (tx) => void tx.objectStore(PENDING).put(review));
}

export async function deletePending(userId: string, id: string): Promise<void> {
  await write([PENDING], (tx) => void tx.objectStore(PENDING).delete([userId, id]));
}

export async function listPending(userId: string): Promise<PendingReview[]> {
  const store = (await openDb()).transaction(PENDING).objectStore(PENDING);
  const all = (await result(store.getAll())) as PendingReview[];
  return all.filter((review) => review.userId === userId);
}

/** Removes a review from the queue; a saved one also takes its card off the cached due list. */
export async function settlePending(review: PendingReview, saved: boolean): Promise<void> {
  await write([PENDING, DUE], async (tx) => {
    tx.objectStore(PENDING).delete([review.userId, review.id]);
    if (!saved) return;
    const due = tx.objectStore(DUE);
    const entry = (await result(due.get(review.userId))) as DueEntry | undefined;
    if (entry) {
      due.put({ ...entry, cards: entry.cards.filter((card) => card.id !== review.cardId) });
    }
  });
}

export async function saveDueCards(userId: string, cards: Card[]): Promise<void> {
  const entry: DueEntry = { userId, cards };
  await write([DUE], (tx) => void tx.objectStore(DUE).put(entry));
}

export async function readDueCards(userId: string): Promise<Card[] | undefined> {
  const store = (await openDb()).transaction(DUE).objectStore(DUE);
  const entry = (await result(store.get(userId))) as DueEntry | undefined;
  return entry?.cards;
}

export async function clearStores(): Promise<void> {
  await write([PENDING, DUE], (tx) => {
    tx.objectStore(PENDING).clear();
    tx.objectStore(DUE).clear();
  });
}
