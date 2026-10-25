export const quotes = [
  { id: 1, category: 'longing', text: 'You wrapped your pretty lies in forever, and I wore them like they were home.' },
  { id: 2, category: 'heartbreak', text: 'The hardest part wasn’t losing you. It was learning how much of us was made of pretty lies.' },
  { id: 3, category: 'healing', text: 'Your pretty lies were the ending. Finding my way back to myself is the love story.' },
  { id: 4, category: 'longing', text: 'I still miss the version of you that lived inside your pretty lies.' },
  { id: 5, category: 'heartbreak', text: 'Some pretty lies don’t shatter your heart. They teach it to break quietly, a little every day.' },
  { id: 6, category: 'healing', text: 'I can forgive the pretty lies without making a home for them in my heart again.' },
  { id: 7, category: 'longing', text: 'Your pretty lies sounded like “stay,” even when your heart had already left.' },
  { id: 8, category: 'heartbreak', text: 'I kept your pretty lies like pressed flowers, wondering why something so beautiful could no longer grow.' },
  { id: 9, category: 'healing', text: 'One day, your pretty lies will be just a page I turn, not the story I tell myself about love.' },
];

const storageKey = 'pretty-lies-saved-v1';
export class QuoteCollection {
  constructor(storage) {
    this.storage = storage;
    this.activeFilter = 'all';
    this.index = 0;
    this.saved = new Set();
    try {
      const parsed = JSON.parse(storage?.getItem(storageKey) ?? '[]');
      if (Array.isArray(parsed)) this.saved = new Set(parsed.filter(id => quotes.some(quote => quote.id === id)));
    } catch { /* A private or unavailable storage area must not block the page. */ }
  }
  get items() {
    return quotes.filter(quote => this.activeFilter === 'all' || (this.activeFilter === 'saved' ? this.saved.has(quote.id) : quote.category === this.activeFilter));
  }
  get current() { return this.items[this.index] ?? null; }
  filter(category) {
    this.activeFilter = ['all', 'longing', 'heartbreak', 'healing', 'saved'].includes(category) ? category : 'all';
    this.index = 0;
  }
  move(direction) {
    this.index = this.items.length ? (this.index + direction + this.items.length) % this.items.length : 0;
  }
  toggleSaved() {
    if (!this.current) return;
    const id = this.current.id;
    this.saved.has(id) ? this.saved.delete(id) : this.saved.add(id);
    this.index = Math.min(this.index, Math.max(this.items.length - 1, 0));
    try { this.storage?.setItem(storageKey, JSON.stringify([...this.saved])); } catch { /* Keep favorites for this visit if persistence is denied. */ }
  }
}
