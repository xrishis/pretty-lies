import './style.css';
import { QuoteCollection } from './quotes.js';
import { createHeartScene } from './heart-scene.js';

const $ = selector => document.querySelector(selector);
let storage;
try { storage = window.localStorage; } catch { /* Private browser storage can be unavailable. */ }
const collection = new QuoteCollection(storage);
let toastTimer;
function notify(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('is-visible'), 2800);
}

function renderQuote() {
  const quote = collection.current;
  $('#quote-text').textContent = quote ? `“${quote.text}”` : 'A little space for the words you love.';
  $('#quote-category').textContent = quote ? `the ${quote.category}.` : 'your collection.';
  $('#quote-number').textContent = quote ? `${String(collection.index + 1).padStart(2, '0')} / ${String(collection.items.length).padStart(2, '0')}` : 'WITH LOVE';
  $('#empty-help').hidden = !!quote;
  $('#quote-card').classList.toggle('is-empty', !quote);
  const saved = !!quote && collection.saved.has(quote.id);
  $('#save-quote').setAttribute('aria-pressed', String(saved));
  $('#save-quote').setAttribute('aria-label', saved ? 'Unsave this quote' : 'Save this quote');
  $('#save-quote').disabled = !quote;
  $('#copy-quote').disabled = !quote;
  $('#previous-quote').disabled = collection.items.length < 2;
  $('#next-quote').disabled = collection.items.length < 2;
  $('#saved-count').textContent = collection.saved.size ? ` (${collection.saved.size})` : '';
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === collection.activeFilter)));
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { collection.filter(button.dataset.filter); renderQuote(); }));
$('#next-quote').addEventListener('click', () => { collection.move(1); renderQuote(); });
$('#previous-quote').addEventListener('click', () => { collection.move(-1); renderQuote(); });
$('#save-quote').addEventListener('click', () => {
  const wasSaved = collection.saved.has(collection.current?.id);
  collection.toggleSaved(); renderQuote();
  notify(wasSaved ? 'Letting this one go.' : 'A little feeling, saved for you.');
});
$('#copy-quote').addEventListener('click', async () => {
  if (!collection.current) return;
  const text = `“${collection.current.text}” — Pretty Lies`;
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else {
      const field = document.createElement('textarea');
      field.value = text; field.style.position = 'fixed'; field.style.opacity = '0';
      document.body.append(field); field.select();
      const copied = document.execCommand('copy'); field.remove();
      if (!copied) throw new Error('Copy unavailable');
    }
    notify('Copied. Send it to a heart that understands.');
  } catch { notify('Copy is unavailable here. You can select the quote to copy it.'); }
});
renderQuote();

const dialog = $('#note-dialog');
document.querySelectorAll('[data-open-note]').forEach(button => button.addEventListener('click', () => dialog.showModal()));
$('.dialog-close').addEventListener('click', () => dialog.close());
$('#keep-note').addEventListener('click', () => { dialog.close(); notify('Your softness is something worth keeping.'); });
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
dialog.addEventListener('close', () => { document.documentElement.classList.remove('dialog-open'); });
new MutationObserver(() => document.documentElement.classList.toggle('dialog-open', dialog.open)).observe(dialog, { attributes: true, attributeFilter: ['open'] });

const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let paused = motionPreference.matches;
let loves = 0;
const heartScene = createHeartScene($('#heart-scene'), { onLove() {
  loves += 1;
  $('#heart-hint').textContent = loves === 1 ? 'A little love looks good on you.' : 'Still soft. Still here. Still loved.';
  notify('Even a mended heart has room for a little love.');
} });
function updateMotion() {
  document.body.classList.toggle('motion-paused', paused);
  document.documentElement.style.scrollBehavior = paused ? 'auto' : '';
  $('#motion-toggle').textContent = paused ? 'Resume motion' : 'Pause motion';
  $('#motion-toggle').setAttribute('aria-pressed', String(paused));
  heartScene.setPaused(paused);
  if (paused) $('#sculpture').style.transform = '';
}
$('#motion-toggle').addEventListener('click', () => { paused = !paused; updateMotion(); });
motionPreference.addEventListener('change', event => { paused = event.matches; updateMotion(); });
updateMotion();
$('.sculpture-wrap').addEventListener('pointermove', event => {
  if (paused || event.pointerType === 'touch') return;
  const rect = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  $('#sculpture').style.transform = `rotateX(${-y * 5}deg) rotateY(${x * 7}deg) translate3d(${x * 7}px,${y * 7}px,0)`;
});
$('.sculpture-wrap').addEventListener('pointerleave', () => { $('#sculpture').style.transform = ''; });
window.addEventListener('pagehide', event => { if (!event.persisted) heartScene.dispose(); });
