# Pretty Lies design and implementation

The user requested a cute 3D website named Pretty Lies, heart-touching quotes mentioning pretty lies, and publication on the xrishis GitHub account. They selected the dreamy and bittersweet direction.

Visual system: pale blush #fff4f5, cocoa #493039, berry #a95a71, glossy pink and lavender hearts. Lora serif content and DM Sans utilities. Two coordinated Image Gen concepts define the hero and quote discovery section. The hero uses matching transparent generated 3D art with cursor parallax; the quote section contains an actual interactive Three.js heart with a bandage. Interface text and controls remain native HTML.

The two sections are connected by generous open whitespace. Header: Pretty Lies; The feeling; Little truths; A note for you. Hero: Pretty Lies.; Some words feel like forever. Even when they were never meant to stay.; Wander through the words; A soft place for the beautifully broken.; Scroll a little. Feel a little. Quote section: Little lies. Big feelings.; category tabs; one paper note; save and copy controls; previous/next arrows; 3D heart. Footer credits xrishis. The note button opens an accessible personal letter dialog. All nine quotes are original and mention pretty lies. Saved quotes persist locally; no visitor data is sent anywhere.

Implementation plan: (1) create Vite static site, art and font assets, native semantic layout; (2) implement quote filtering, pagination, copy, favorites, note dialog, reduced motion and interactive 3D heart; (3) build, test state edge cases, inspect desktop/mobile and concept fidelity with Playwright because the Browser plugin is absent; (4) create xrishis/pretty-lies, enable GitHub Pages, push source and deployment workflow, wait for deployment and verify the public site.

Alternatives considered: CSS-only decoration is lighter but less tactile; a fully WebGL-rendered page weakens accessible text. The selected hybrid combines generated art with a live 3D model and native accessible controls. Implementation choices are the builder's calls within the user's request.

Review focus: mobile overflow; localStorage denial/corruption; no saved quotes; WebGL unavailable; reduced motion. Test storage and navigation in Node, and controls, responsive layout, model rendering, keyboard dialog behavior and live publishing in the browser. Static build must use /pretty-lies/ as its base.
