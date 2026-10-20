// The Notes page's maths editor, for any page of the game. This is the same code as the Notes page runs (the editor that turns ^ _ / ~ and Shift+letter into
// drawn powers, fractions, roots, integrals and Greek letters), copied out of learn/index.html so that the Workbook's pages behave exactly like Notes pages.
// If the Notes editor changes, regenerate this file (see the memory note on the Workbook build). Exposes window.LMMath.
(function () {
    const nbAssistE = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const MATH_SHORTCUT_GREEK_MAP_GLOBAL = {
        'a': { lower: 'α', upper: 'Α' }, 'b': { lower: 'β', upper: 'Β' },
        'd': { lower: 'Δ', upper: 'Δ' }, 'y': { lower: 'γ', upper: 'Γ' },
        'u': { lower: 'μ', upper: 'Μ' }, 'p': { lower: 'π', upper: 'Π' },
        't': { lower: 'θ', upper: 'Θ' }, 's': { lower: 'σ', upper: 'Σ' },
        'l': { lower: 'λ', upper: 'Λ' }, 'w': { lower: 'ω', upper: 'Ω' },
        'x': { lower: 'χ', upper: 'Χ' },
    };
    const MATH_SHORTCUT_TWO_CHAR_GLOBAL = { '<=': '≤', '>=': '≥', '!=': '≠', '==': '≡', '~~': '≈' };
    const MATH_SHORTCUT_ZWS_GLOBAL = '​';
    // Autocorrect (Notes page): a typed word that is on this list is replaced when the next space or punctuation is typed. Only mistakes that are
    // never a real word are here, so nothing a student meant is ever changed. Keys are lower case; capitals are carried across.
    // Beyond the list: a word that is not in an English word list, and is one slip away from exactly one word that is (letters swapped, one
    // missing, one extra, one wrong), is corrected to it. The word list (common English, British spellings, about 500 KB) is fetched once from
    // the jsDelivr CDN the first time autocorrect is used, and the browser keeps it. Until it has arrived only the fixed list above applies.
    let nbDict = null, nbDictLoading = null;
    function nbLoadDictionary() {
        if (nbDict || nbDictLoading) return nbDictLoading;
        const base = 'https://cdn.jsdelivr.net/npm/wordlist-english@1.2.1/', levels = [10, 20, 35, 40];
        const files = [];
        ['english', 'british'].forEach((k) => levels.forEach((l) => files.push([k + '-words-' + l, l])));
        nbDictLoading = Promise.all(files.map(([f]) => fetch(base + f + '.json').then((r) => (r.ok ? r.json() : [])).catch(() => []))).then((lists) => {
            const m = new Map();
            lists.forEach((list, k) => { const level = files[k][1]; (Array.isArray(list) ? list : []).forEach((w) => { const lw = String(w).toLowerCase(); if (!m.has(lw) || m.get(lw) > level) m.set(lw, level); }); });
            if (m.size > 2000) nbDict = m;
            return nbDict;
        }).catch(() => null);
        return nbDictLoading;
    }
    function nbDictCorrect(word) {
        if (!nbDict || word.length < 6 || word.length > 20 || !/^[a-z]+$/.test(word) || nbDict.has(word)) return null;
        const L = 'abcdefghijklmnopqrstuvwxyz', n = word.length, found = new Map(), trans = [];
        const add = (c, kind) => { if (c !== word && c[0] === word[0] && nbDict.has(c) && !found.has(c)) { found.set(c, kind); if (kind === 't') trans.push(c); } };
        for (let i = 0; i < n - 1; i++) add(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2), 't');
        for (let i = 0; i < n; i++) add(word.slice(0, i) + word.slice(i + 1), 'd');
        for (let i = 0; i < n; i++) for (let k = 0; k < 26; k++) add(word.slice(0, i) + L[k] + word.slice(i + 1), 's');
        for (let i = 0; i <= n; i++) for (let k = 0; k < 26; k++) add(word.slice(0, i) + L[k] + word.slice(i), 'i');
        if (trans.length === 1) return trans[0];                  // two letters the wrong way round is by far the most likely slip
        if (found.size === 1) return found.keys().next().value;
        let best = null, bl = 99, tie = false;
        found.forEach((kind, c) => { const lv = nbDict.get(c); if (lv < bl) { best = c; bl = lv; tie = false; } else if (lv === bl) tie = true; });
        return !tie && bl <= 20 ? best : null;
    }
    let nbAcIgnored = (() => { try { return new Set(JSON.parse(localStorage.getItem('lm-notes-ac-ignore') || '[]')); } catch (_) { return new Set(); } })();
    function nbAcIgnore(word) { nbAcIgnored.add(word); try { localStorage.setItem('lm-notes-ac-ignore', JSON.stringify(Array.from(nbAcIgnored).slice(-500))); } catch (_) { /* a convenience only */ } }
    const NOTES_AUTOCORRECT_WORDS = {
        teh: 'the', hte: 'the', adn: 'and', nad: 'and', taht: 'that', thta: 'that', waht: 'what', wiht: 'with', whcih: 'which', wich: 'which', wihch: 'which',
        thier: 'their', theyre: "they're", youre: "you're", dont: "don't", doesnt: "doesn't", didnt: "didn't", isnt: "isn't", wasnt: "wasn't", arent: "aren't",
        werent: "weren't", couldnt: "couldn't", wouldnt: "wouldn't", shouldnt: "shouldn't", havent: "haven't", hasnt: "hasn't", cant: "can't", wont: "won't",
        recieve: 'receive', recieved: 'received', beleive: 'believe', belive: 'believe', freind: 'friend', wierd: 'weird', acheive: 'achieve', acheived: 'achieved',
        becuase: 'because', becasue: 'because', beacuse: 'because', bcause: 'because', seperate: 'separate', seperately: 'separately', definately: 'definitely',
        definitly: 'definitely', occured: 'occurred', occurence: 'occurrence', untill: 'until', alot: 'a lot', tommorow: 'tomorrow', tomorow: 'tomorrow',
        goverment: 'government', govenment: 'government', enviroment: 'environment', enviornment: 'environment', accomodate: 'accommodate', calender: 'calendar',
        collegue: 'colleague', comming: 'coming', conciously: 'consciously', existance: 'existence', foriegn: 'foreign', grammer: 'grammar', happend: 'happened',
        immediatly: 'immediately', independant: 'independent', knowlege: 'knowledge', libary: 'library', neccessary: 'necessary', necessery: 'necessary',
        noticable: 'noticeable', occassion: 'occasion', persistant: 'persistent', posession: 'possession', prefered: 'preferred', probaly: 'probably',
        probly: 'probably', publically: 'publicly', realy: 'really', refered: 'referred', relevent: 'relevant', responsability: 'responsibility',
        rythm: 'rhythm', succesful: 'successful', successfull: 'successful', truely: 'truly', unforseen: 'unforeseen', wether: 'whether', writting: 'writing',
        yeild: 'yield', tounge: 'tongue', diffrent: 'different', diferent: 'different', difference: 'difference', intresting: 'interesting', interseting: 'interesting',
        importent: 'important', importantly: 'importantly', usally: 'usually', usualy: 'usually', actualy: 'actually', basicly: 'basically', basicaly: 'basically',
        eventualy: 'eventually', generaly: 'generally', especialy: 'especially', accross: 'across', agian: 'again', aganist: 'against', againts: 'against',
        amoung: 'among', aswell: 'as well', thsi: 'this', tihs: 'this', thigns: 'things', thign: 'thing', somthing: 'something', somehting: 'something',
        becomming: 'becoming', begining: 'beginning', beggining: 'beginning', beleif: 'belief', buisness: 'business', bussiness: 'business', catagory: 'category',
        concensus: 'consensus', definate: 'definite', desparate: 'desperate', dissapear: 'disappear', embarass: 'embarrass', excercise: 'exercise',
        familar: 'familiar', finaly: 'finally', fourth: 'fourth', gaurd: 'guard', harrass: 'harass', hieght: 'height', humourous: 'humorous', ignorence: 'ignorance',
        imediately: 'immediately', incidently: 'incidentally', jewelry: 'jewellery', judgement: 'judgement', lenght: 'length', liason: 'liaison', mispell: 'misspell',
        neice: 'niece', ocurred: 'occurred', paralel: 'parallel', parliment: 'parliament', percieve: 'perceive', playwrite: 'playwright', politican: 'politician',
        potatos: 'potatoes', priviledge: 'privilege', pronounciation: 'pronunciation', recomend: 'recommend', reccomend: 'recommend', rember: 'remember',
        remeber: 'remember', resistence: 'resistance', sence: 'sense', sieze: 'seize', speach: 'speech', strenght: 'strength', suprise: 'surprise',
        supprise: 'surprise', tendancy: 'tendency', therfore: 'therefore', thoroghly: 'thoroughly', threshhold: 'threshold', tyrany: 'tyranny', vaccum: 'vacuum',
        wellfare: 'welfare', whereever: 'wherever', wholely: 'wholly', withold: 'withhold', wonderfull: 'wonderful',
        // maths and economics
        derivitive: 'derivative', derivitives: 'derivatives', intergral: 'integral', integeral: 'integral', fuction: 'function', funtion: 'function',
        probabilty: 'probability', varience: 'variance', averge: 'average', gradiant: 'gradient', equasion: 'equation', equaton: 'equation', equaiton: 'equation',
        quadradic: 'quadratic', quadtratic: 'quadratic', coeficient: 'coefficient', coefficent: 'coefficient', theorom: 'theorem', thereom: 'theorem',
        triangel: 'triangle', sqaure: 'square', pythagorus: 'pythagoras', equilibirum: 'equilibrium', equilibrum: 'equilibrium', equilibruim: 'equilibrium',
        inflaton: 'inflation', elasticty: 'elasticity', elastisity: 'elasticity', demmand: 'demand', suply: 'supply', suppy: 'supply', monoploy: 'monopoly',
        oligoply: 'oligopoly', compitition: 'competition', competion: 'competition', unemployement: 'unemployment', recesion: 'recession', econmy: 'economy',
        econmics: 'economics', marginl: 'marginal', opportunty: 'opportunity', externalites: 'externalities', subsidys: 'subsidies', producton: 'production',
        consumtion: 'consumption', investmnet: 'investment', aggregrate: 'aggregate', agregate: 'aggregate', multipler: 'multiplier', fiscle: 'fiscal',
    };

    // Automatic word/maths detection (backslash escapes, a fraction
    // blocklist) turned out unreliable in real use — the student reported
    // it still wasn't distinguishing correctly. Replaced with an explicit
    // mode the student controls directly: maths shortcuts are ON by
    // default (this is the Maths Tool, most of what's typed here is
    // maths), and typing "#" toggles into plain English mode until the
    // next "#" toggles back — e.g. "#integrate# x^(2) +3x" types the word
    // "integrate" literally, then resumes maths shortcuts. The "#"
    // keystrokes themselves are consumed (preventDefault) and never
    // inserted, so they never show up in the answer.
    // The shortcut list, shared by the editor's own collapsible hint and the Notes page's closable popup, so the two can never differ.
    const K = (t) => `<kbd>${t}</kbd>`;
    const SC_MATHS_SYMBOLS = ['Maths keyboard: symbols', [
        [K('^'), 'Starts a power, such as x². Press ' + K('Space') + ' or ' + K('→') + ' to leave the power and carry on at normal size.'],
        [K('_'), 'Starts a subscript, such as x₁. Leave it the same way as a power.'],
        [K('/'), 'Makes a fraction. After a number it uses that number as the top (3/ gives 3 over a box). After a closing bracket it uses everything inside the brackets as the top.'],
        [K('*'), 'Types a multiplication sign ×.'],
        [K('~'), 'Starts a square root. Its top line grows across anything typed inside it; press ' + K('→') + ' or ' + K('Tab') + ' to leave it.'],
        [K('Caps Lock') + ' + ' + K('~'), 'Types a root with a small box for the index, such as a cube root. Press ' + K('Space') + ' to leave the box.'],
        [K('Shift') + ' + a letter', 'Types the Greek letter for it (Shift+A gives α). With Caps Lock on you get the capital.'],
        [K('&lt;=') + ' ' + K('&gt;=') + ' ' + K('!='), 'Typed as two keys, these turn into ≤, ≥ and ≠.'],
        [K('Ctrl') + ' + ' + K('-'), 'Puts a bar over the letter before the cursor (x̄), or over the selected text. Press it again to take it off.'],
        [K('Shift') + ' + ' + K('E'), 'Types ∈, "belongs to the set of", such as c ∈ ℝ.'],
        [K('f'), 'Types f(x). Press ' + K("'") + ' straight after it for f′(x), and again for f″(x).'],
        [K('Shift') + ' + ' + K('I'), 'Types an integral sign. Then press ' + K('d') + ' to add the limits.'],
        [K(']'), 'After an integral sign, closing a square bracket evaluates between limits, such as ∫ 2x dx = [x²] from 0 to 2. Square brackets anywhere else stay as they are.'],
        [K('~') + K('~'), 'Two tildes in a row type ≈, approximately equal to.'],
    ]];
    const SC_MATHS_LAYOUT = ['Maths keyboard: layout and switching', [
        [K('Space') + ' on a new line', 'If the line above has an equals sign, the new line lines up under the right-hand side of it. This keeps working lines neat.'],
        [K('Shift') + ' + ' + K('M'), 'Starts a matrix. Type the size as (rows*columns), for example (3*3), then press ' + K(')') + ' or ' + K('Enter') + '.'],
        [K('Tab') + ' or arrows', 'Move between the cells of a matrix. ' + K('→') + ' from the last cell leaves it, and then ' + K('^') + ' gives a power such as −1.'],
        [K('#'), 'Switches this text box between the maths keyboard and normal writing. Each text box remembers its own setting.'],
    ]];
    // One table builder for every shortcut list, so the Notes popup and the Maths Tool hint look and read the same.
    function shortcutTableHtml(sections) {
        return sections.map(([title, rows]) => `<table class="sc-table"><caption>${title}</caption><thead><tr><th scope="col">You press</th><th scope="col">What happens</th></tr></thead><tbody>${rows.map(([k, d]) => `<tr><th scope="row">${k}</th><td>${d}</td></tr>`).join('')}</tbody></table>`).join('');
    }
    const MATHS_SHORTCUT_ITEMS_HTML = shortcutTableHtml([SC_MATHS_SYMBOLS, SC_MATHS_LAYOUT]);
    // Notes page: one keyboard, and LastMind works out from what is around the cursor whether a key is maths or ordinary writing.
    const SC_NOTES_SYMBOLS = ['Maths shortcuts (they apply by themselves as you write)', [
        [K('^') + ' ' + K('_'), 'Start a power (x²) or a subscript (x₁) when typed straight after a letter, a number or a bracket. Press ' + K('Space') + ' or ' + K('→') + ' to leave it.'],
        [K('/'), 'Makes a fraction after a number, a bracket or a short variable (3/, (a+b)/, x/). After a word it is just a slash, so and/or stays as typed.'],
        [K('*'), 'Types a multiplication sign × after a number, letter or bracket.'],
        [K('~'), 'Starts a square root when it follows an equals or other maths sign (x = ~). Press ' + K('→') + ' or ' + K('Tab') + ' to leave it.'],
        [K('Caps Lock') + ' + ' + K('~'), 'Types a root with a small box for the index, such as a cube root.'],
        [K('Shift') + ' + a letter', 'Types the Greek letter when you are writing maths: straight after a number, a sign (x = ), a letter such as sin, or a bracket that follows a function. In ordinary writing (the start of a line or sentence, after a word) it is just a capital letter. ' + K('Alt') + ' + ' + K('Shift') + ' + a letter always gives the Greek letter. With Caps Lock on you get the capital Greek letter.'],
        [K('&lt;=') + ' ' + K('&gt;=') + ' ' + K('!=') + ' ' + K('=='), 'Typed as two keys, these turn into ≤, ≥, ≠ and the identity sign ≡.'],
        [K('Ctrl') + ' + ' + K('-'), 'Puts a bar over the word just before the cursor (a variable name such as GDP or Y, a letter, a Greek letter), over a bracket group, or over the selected text: x̄ for a mean, or an exogenous variable. What you type next is not barred. Press it again straight after the barred part to take the bar off.'],
        [K('Shift') + ' + ' + K('E'), 'Types ∈, "belongs to the set of", such as c ∈ ℝ. Straight after a single letter and a space (c ) it always gives ∈; elsewhere it follows the same maths-or-writing rule as the Greek letters.'],
        [K('Shift') + ' + ' + K('F'), 'Types f(x) when you are writing maths. At the start of a line, type a capital F and then ' + K('(') + ': it becomes f(x). Press ' + K("'") + ' straight after it for f′(x), and again for f″(x).'],
        [K('Shift') + ' + ' + K('I'), 'Types an integral sign in maths (after a sign or a number); a capital I in ordinary writing. Then press ' + K('d') + ' to add the limits.'],
        [K(']'), 'After an integral sign, closing a square bracket evaluates between limits, such as ∫ 2x dx = [x²] from 0 to 2. Square brackets anywhere else stay as they are.'],
        [K('~') + K('~'), 'Two tildes in a row type ≈, approximately equal to.'],
        [K('Shift') + ' + ' + K('M'), 'Starts a matrix in maths. Type the size as (rows*columns), for example (3*3), then press ' + K(')') + ' or ' + K('Enter') + '.'],
        [K('Space') + ' on a new line', 'If the line above has an equals sign, the new line lines up under the right-hand side of it.'],
    ]];

    // opts (all optional): onModeChange(writingMode) when the keyboard switches between maths and English; hideShortcutHint to leave the
    // inline shortcut list out (the Notes page shows it as a popup instead).
    // ─── Maths layout helpers, shared by both maths editors (Notes and the Maths Tool use createSmartAnswerEditor; lesson answer boxes use
    // createMathShortcutEditor). A new line that starts with a Space lines its first character up with the right-hand side of the "=" on the line
    // directly above, so a derivation reads down the page; only that one line above is looked at, never any earlier line.
    const MATHS_ZONES = 'sup, sub, .frac, .mx, .int-limits, .root, .root-n';
    const MATHS_BLOCK = /^(DIV|P|UL|OL|H1|H2|H3|LI)$/;
    function mathsAlignToEquals(editor) {
        const sel = window.getSelection();
        if (!sel.rangeCount || !sel.isCollapsed) return false;
        const range = sel.getRangeAt(0), node = range.startContainer;
        if (!editor.contains(node)) return false;
        const host = node.nodeType === 1 ? node : node.parentNode;
        if (host && host.closest && host.closest(MATHS_ZONES)) return false;           // Space leaves a power, subscript or fraction there
        let cur = node; while (cur && cur.parentNode !== editor) cur = cur.parentNode;
        if (!cur || cur.nodeType !== 1 || !/^(DIV|P)$/.test(cur.tagName)) return false;   // the very first line has nothing above it
        const before = document.createRange(); before.selectNodeContents(cur); before.setEnd(range.startContainer, range.startOffset);
        const frag = before.cloneContents();
        if (frag.textContent.replace(/[\u200B\s]/g, '') || frag.querySelector('*:not(br)')) return false; // only at the very start of the line
        const above = []; let p = cur.previousSibling;
        if (p && p.nodeType === 1 && MATHS_BLOCK.test(p.tagName)) above.push(p);
        else while (p && !(p.nodeType === 1 && MATHS_BLOCK.test(p.tagName))) { above.unshift(p); p = p.previousSibling; }
        if (!above.length) return false;
        let eq = null;
        for (const n of above) {
            const walker = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) {
                const t = walker.currentNode, par = t.parentElement;
                if (par && par.closest(MATHS_ZONES)) continue;                              // an "=" inside a fraction or power is not the line's equals sign
                const i = t.textContent.indexOf('=');
                if (i >= 0) { eq = { t, i }; break; }
            }
            if (eq) break;
        }
        if (!eq) return false;
        const r = document.createRange(); r.setStart(eq.t, eq.i); r.setEnd(eq.t, eq.i + 1);
        const rect = r.getBoundingClientRect();
        if (!rect.width) return false;
        const indent = Math.max(0, Math.round(rect.right - cur.getBoundingClientRect().left + 5));
        cur.style.paddingLeft = indent + 'px'; cur.dataset.eqAlign = '1';
        editor.dispatchEvent(new Event('input', { bubbles: true }));                        // so the change is saved
        return true;
    }
    // Pressing Enter copies a line's style onto the new line; the alignment belongs only to the line it was made for.
    function mathsClearClonedAlign(editor) {
        setTimeout(() => {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            let cur = sel.getRangeAt(0).startContainer;
            while (cur && cur.parentNode !== editor) cur = cur.parentNode;
            if (cur && cur.nodeType === 1 && cur.dataset && cur.dataset.eqAlign) {
                cur.style.paddingLeft = ''; delete cur.dataset.eqAlign;
                if (!cur.getAttribute('style')) cur.removeAttribute('style');
            }
        }, 0);
    }

    // A "/" typed straight after a closing bracket turns everything inside that bracket pair into the numerator and drops the brackets, so
    // (2xh + h^2)/ becomes a fraction over an empty denominator with the caret in it. The pair is found on the same line by matching brackets
    // (a nested pair is skipped over). Returns false, doing nothing, whenever it does not apply, so the ordinary "/" behaviour carries on.
    function mathsFractionFromBrackets(editor) {
        const sel = window.getSelection();
        if (!sel.rangeCount || !sel.isCollapsed) return false;
        const rg = sel.getRangeAt(0), node = rg.startContainer;
        if (!editor.contains(node)) return false;
        const host = node.nodeType === 1 ? node : node.parentNode;
        if (host && host.closest && host.closest(MATHS_ZONES)) return false;
        // Brackets typed on the maths keyboard are <span class="math-bracket"> elements, siblings of the other pieces of the line.
        let parent, upTo;                       // the siblings before the caret are parent.childNodes[0 .. upTo)
        if (node.nodeType === 3) {
            parent = node.parentNode;
            upTo = Array.prototype.indexOf.call(parent.childNodes, node);
            const before = node.textContent.slice(0, rg.startOffset).replace(/\u200B/g, '');
            if (before) return false;           // text between the ")" and the caret
            // the text node itself holds only invisible landing characters before the caret, so it counts as "nothing"
        } else { parent = node; upTo = rg.startOffset; }
        const kids = Array.prototype.slice.call(parent.childNodes, 0, upTo);
        let ci = kids.length - 1;
        while (ci >= 0 && kids[ci].nodeType === 3 && !kids[ci].textContent.replace(/\u200B/g, '')) ci--;
        const isB = (n, c) => n && n.nodeType === 1 && n.classList.contains('math-bracket') && n.textContent === c;
        if (ci < 0 || !isB(kids[ci], ')')) return false;     // the "/" must come directly after the ")"
        let depth = 0, oi = -1;
        for (let j = ci; j >= 0; j--) {
            if (isB(kids[j], ')')) depth++; else if (isB(kids[j], '(')) { depth--; if (depth === 0) { oi = j; break; } }
        }
        if (oi < 0) return false;
        const open = kids[oi], close = kids[ci];
        const big = document.createRange(); big.setStartBefore(open); big.setEndAfter(close);
        const frag = big.extractContents();                  // "(" ... ")" inclusive
        frag.removeChild(frag.firstChild); frag.removeChild(frag.lastChild);   // drop the two outer bracket spans
        const num = document.createElement('span'); num.className = 'frac-num';
        num.appendChild(frag);
        if (!num.textContent.replace(/\u200B/g, '') && !num.querySelector('*')) num.textContent = '\u200B';
        const den = document.createElement('span'); den.className = 'frac-den'; den.appendChild(document.createTextNode('\u200B'));
        const frac = document.createElement('span'); frac.className = 'frac'; frac.appendChild(num); frac.appendChild(den);
        big.insertNode(frac);
        const caret = document.createRange(); caret.setStart(den.firstChild, 1); caret.collapse(true);
        sel.removeAllRanges(); sel.addRange(caret);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
    }

    // The general version of the above, for when the brackets are not simple neighbours: a bracket pair with f(x), powers, subscripts or another
    // fraction inside it, a closing bracket that sits inside a subscript, or text and bracket spans mixed. It reads the visible characters on the
    // line up to the caret, matches the final ")" with its "(" (counting every bracket, including the ones inside f(x)), and puts everything
    // between them on top of the fraction.
    function mathsFractionFromAnyBrackets(editor) {
        const sel = window.getSelection();
        if (!sel.rangeCount || !sel.isCollapsed) return false;
        const caret = sel.getRangeAt(0);
        if (!editor.contains(caret.startContainer)) return false;
        let line = caret.startContainer.nodeType === 1 ? caret.startContainer : caret.startContainer.parentNode;
        while (line && line !== editor && !(line.nodeType === 1 && /^(DIV|P|LI|H1|H2)$/.test(line.tagName))) line = line.parentNode;
        if (!line) line = editor;
        const chars = [];
        const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const c = document.createRange(); c.selectNodeContents(n);
            if (caret.compareBoundaryPoints(Range.START_TO_START, c) <= 0 && !(n === caret.startContainer)) break;   // wholly after the caret
            const text = n.textContent, end = n === caret.startContainer ? caret.startOffset : text.length;
            for (let k = 0; k < end; k++) if (text[k] !== '\u200B') chars.push({ n, k, c: text[k] });
        }
        if (!chars.length || chars[chars.length - 1].c !== ')') return false;
        let depth = 0, open = -1;
        for (let j = chars.length - 1; j >= 0; j--) {
            if (chars[j].c === ')') depth++;
            else if (chars[j].c === '(') { depth--; if (depth === 0) { open = j; break; } }
        }
        if (open < 0 || open === chars.length - 1) return false;
        const a = chars[open], z = chars[chars.length - 1];
        const big = document.createRange(); big.setStart(a.n, a.k); big.setEnd(z.n, z.k + 1);
        const frag = big.extractContents();
        // take the outer pair of brackets off the numerator (a bracket typed on the maths keyboard is a span of its own)
        const dropEnd = (first, ch) => {
            const w = document.createTreeWalker(frag, NodeFilter.SHOW_TEXT);
            const nodes = []; for (let n = w.nextNode(); n; n = w.nextNode()) nodes.push(n);
            const list = first ? nodes : nodes.slice().reverse();
            for (const n of list) {
                const t = n.textContent;
                const idx = first ? t.search(/[^\u200B]/) : (() => { for (let i = t.length - 1; i >= 0; i--) if (t[i] !== '\u200B') return i; return -1; })();
                if (idx < 0) continue;
                if (t[idx] !== ch) return;
                const par = n.parentNode;
                if (par && par.classList && par.classList.contains('math-bracket') && t.replace(/\u200B/g, '') === ch) par.remove();
                else n.textContent = t.slice(0, idx) + t.slice(idx + 1);
                return;
            }
        };
        dropEnd(true, '('); dropEnd(false, ')');
        const num = document.createElement('span'); num.className = 'frac-num'; num.appendChild(frag);
        if (!num.textContent.replace(/\u200B/g, '') && !num.querySelector('*')) num.textContent = '\u200B';
        const den = document.createElement('span'); den.className = 'frac-den'; den.appendChild(document.createTextNode('\u200B'));
        const frac = document.createElement('span'); frac.className = 'frac'; frac.appendChild(num); frac.appendChild(den);
        big.insertNode(frac);
        const to = document.createRange(); to.setStart(den.firstChild, 1); to.collapse(true);
        sel.removeAllRanges(); sel.addRange(to);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
    }

    function createSmartAnswerEditor(placeholder, opts) {
        opts = opts || {};
        // auto: no keyboard to switch. The maths shortcuts are always on, and each one that could get in the way of ordinary writing only fires
        // where the text around the cursor says it is maths (see mathsContext below). Used by the Notes page.
        const auto = !!opts.auto;
        const wrap = document.createElement('div');
        wrap.className = 'math-shortcut-wrap';
        const editor = document.createElement('div');
        editor.className = 'math-shortcut-editor';
        editor.contentEditable = 'true';
        editor.dataset.placeholder = placeholder || 'Write your answer here…';
        wrap.appendChild(editor);
        const hint = document.createElement('div');
        hint.className = 'math-shortcut-hint';
        hint.innerHTML = `<button type="button" class="math-shortcut-toggle" aria-expanded="false">Keyboard shortcuts <span class="math-shortcut-caret">▸</span></button>
            <div class="math-shortcut-list" hidden>${MATHS_SHORTCUT_ITEMS_HTML}</div>`;
        if (!opts.hideShortcutHint) wrap.appendChild(hint);
        // Collapsible: the list is long, so it opens and closes on demand (and
        // remembers which the student last chose).
        (function wireShortcutToggle() {
            const toggle = hint.querySelector('.math-shortcut-toggle');
            const list = hint.querySelector('.math-shortcut-list');
            const caret = hint.querySelector('.math-shortcut-caret');
            const set = (open) => {
                list.hidden = !open;
                toggle.setAttribute('aria-expanded', String(open));
                caret.textContent = open ? '▾' : '▸';
                try { localStorage.setItem('lm-shortcuts-open', open ? '1' : '0'); } catch (_) {}
            };
            let startOpen = false;
            try { startOpen = localStorage.getItem('lm-shortcuts-open') === '1'; } catch (_) {}
            set(startOpen);
            toggle.addEventListener('click', () => set(list.hidden));
        })();
        const modeBadge = document.createElement('div');
        modeBadge.className = 'math-shortcut-mode-badge';
        wrap.appendChild(modeBadge);

        let writingMode = false;
        function updateModeBadge() {
            // Red spelling underlines belong to writing, not to maths: "lim", "sin" and variable names are not misspellings.
            const shown = auto ? true : writingMode;
            editor.spellcheck = shown; editor.setAttribute('spellcheck', String(shown));
            modeBadge.textContent = shown ? 'Mode: writing (# for maths)' : 'Mode: maths (# for writing)';
            modeBadge.classList.toggle('writing', shown);
            modeBadge.hidden = auto;
            if (typeof opts.onModeChange === 'function') opts.onModeChange(shown);
        }
        updateModeBadge();

        function insertTextAtCaret(text) {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const node = document.createTextNode(text);
            range.insertNode(node);
            range.setStartAfter(node); range.setEndAfter(node);
            sel.removeAllRanges(); sel.addRange(range);
        }
        function insertStyledSymbol(text) {
            const sel = window.getSelection();
            if (!sel.rangeCount) return null;
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const span = document.createElement('i');
            span.className = 'math-symbol';
            if (/^[Α-Ω]$/.test(text)) span.classList.add('math-greek-upper');
            span.textContent = text;
            const landing = document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL);
            const frag = document.createDocumentFragment();
            frag.appendChild(span); frag.appendChild(landing);
            range.insertNode(frag);
            const after = document.createRange();
            after.setStart(landing, 1); after.collapse(true);
            sel.removeAllRanges(); sel.addRange(after);
            return span;
        }
        function insertMathBracket(text) {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0); range.deleteContents();
            const bracket = document.createElement('span'); bracket.className = 'math-bracket'; bracket.textContent = text;
            const landing = document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL);
            const frag = document.createDocumentFragment(); frag.appendChild(bracket); frag.appendChild(landing); range.insertNode(frag);
            const after = document.createRange(); after.setStart(landing, 1); after.collapse(true); sel.removeAllRanges(); sel.addRange(after);
        }
        function startZone(tag) {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const zone = document.createElement(tag);
            zone.appendChild(document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL));
            range.insertNode(zone);
            const inner = document.createRange();
            inner.setStart(zone.firstChild, 1); inner.collapse(true);
            sel.removeAllRanges(); sel.addRange(inner);
        }
        function currentZone() {
            const sel = window.getSelection();
            if (!sel.rangeCount) return null;
            let node = sel.getRangeAt(0).startContainer;
            while (node && node !== editor) {
                if (node.nodeType === 1 && (node.tagName === 'SUP' || node.tagName === 'SUB')) return node;
                node = node.parentNode;
            }
            return null;
        }
        function exitZoneAfter(zoneEl) {
            const parent = zoneEl.parentNode, nextSibling = zoneEl.nextSibling;
            if (zoneEl.textContent === MATH_SHORTCUT_ZWS_GLOBAL) {
                zoneEl.remove();
            } else {
                zoneEl.normalize && zoneEl.normalize();
                const zw = zoneEl.firstChild;
                if (zw && zw.nodeType === 3 && zw.textContent.charAt(0) === MATH_SHORTCUT_ZWS_GLOBAL) zw.textContent = zw.textContent.slice(1);
            }
            const landing = document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL);
            (parent || editor).insertBefore(landing, nextSibling || null);
            const sel = window.getSelection();
            const range = document.createRange();
            range.setStart(landing, 1); range.collapse(true);
            sel.removeAllRanges(); sel.addRange(range);
        }
        function findTokenBeforeCaret() {
            const sel = window.getSelection();
            if (!sel.rangeCount || !sel.isCollapsed) return null;
            const caret = sel.getRangeAt(0);
            const caretHost = caret.startContainer.nodeType === 1 ? caret.startContainer : caret.startContainer.parentElement;
            // A wrapped visual line does not necessarily insert whitespace in
            // Range#toString. Restrict the search to the current structural
            // line so a fraction on a child arrow can never absorb the arrow
            // or the final word on its parent line.
            let lineRoot = caretHost && caretHost.closest ? caretHost.closest('.nb-arrow-step, .nb-plain-line, li, p, h1, h2, h3, div') : null;
            if (!lineRoot || lineRoot === editor || !editor.contains(lineRoot)) lineRoot = editor;
            const before = document.createRange();
            before.selectNodeContents(lineRoot); before.setEnd(caret.startContainer, caret.startOffset);
            const text = before.toString();
            // A numerator is the full uninterrupted term. Zero-width caret
            // landing characters and separate styled spans must not split 5y,
            // while a real space deliberately starts a new numerator.
            const match = text.match(/[0-9A-Za-zΑ-ω.\u200b]+$/);
            if (!match || !match[0].replace(/\u200b/g, '')) return null;
            let remaining = text.length - match[0].length, startNode = null, startOffset = 0;
            const walker = document.createTreeWalker(lineRoot, NodeFilter.SHOW_TEXT);
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                if (remaining <= node.textContent.length) { startNode = node; startOffset = remaining; break; }
                remaining -= node.textContent.length;
            }
            if (!startNode) return null;
            const tokenRange = document.createRange();
            tokenRange.setStart(startNode, startOffset); tokenRange.setEnd(caret.startContainer, caret.startOffset);
            return { range: tokenRange };
        }
        function makeFraction(numContent) {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const frac = document.createElement('span'); frac.className = 'frac';
            const num = document.createElement('span'); num.className = 'frac-num';
            const den = document.createElement('span'); den.className = 'frac-den';
            const hasNum = !!(numContent && numContent.textContent.replace(/\u200b/g, ''));
            if (hasNum) num.appendChild(numContent); else num.appendChild(document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL));
            den.appendChild(document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL));
            frac.appendChild(num); frac.appendChild(den);
            range.insertNode(frac);
            const inner = document.createRange();
            if (hasNum) inner.setStart(den.firstChild, 1); else inner.setStart(num.firstChild, 1);
            inner.collapse(true);
            sel.removeAllRanges(); sel.addRange(inner);
        }
        function insertSquareRoot() {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0); range.deleteContents();
            const root = document.createElement('span'); root.className = 'root';
            const symbol = document.createElement('span'); symbol.className = 'root-symbol'; symbol.textContent = '√';
            const radicand = document.createElement('span'); radicand.className = 'root-radicand';
            const inside = document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL); radicand.appendChild(inside);
            root.appendChild(symbol); root.appendChild(radicand);
            const landing = document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL);
            const frag = document.createDocumentFragment(); frag.appendChild(root); frag.appendChild(landing); range.insertNode(frag);
            const inner = document.createRange(); inner.setStart(inside, 1); inner.collapse(true);
            sel.removeAllRanges(); sel.addRange(inner);
        }
        function currentFracPart() {
            const sel = window.getSelection();
            if (!sel.rangeCount) return null;
            let node = sel.getRangeAt(0).startContainer;
            while (node && node !== editor) {
                if (node.nodeType === 1 && (node.className === 'frac-num' || node.className === 'frac-den')) return node;
                node = node.parentNode;
            }
            return null;
        }
        function advanceFracNumToDen(numEl) {
            numEl.normalize && numEl.normalize();
            const first = numEl.firstChild;
            if (first && first.nodeType === 3 && first.textContent.charAt(0) === MATH_SHORTCUT_ZWS_GLOBAL && first.textContent.length > 1) first.textContent = first.textContent.slice(1);
            const den = numEl.parentNode.querySelector('.frac-den');
            const sel = window.getSelection();
            const range = document.createRange();
            range.setStart(den.firstChild, 1); range.collapse(true);
            sel.removeAllRanges(); sel.addRange(range);
        }

        let funcPrimeLanding = null, funcPrimeSpan = null;
        function isCaretAt(node, offset) {
            const sel = window.getSelection();
            if (!sel.rangeCount || !sel.isCollapsed) return false;
            const r = sel.getRangeAt(0);
            return r.startContainer === node && r.startOffset === offset;
        }
        // 'f' only triggers f(x) notation at a word boundary — otherwise
        // every plain English word containing the letter (differentiate,
        // for, of, function...) gets "(x)" spliced into the middle of it.
        function precedingCharIsLetter() {
            const sel = window.getSelection();
            if (!sel.rangeCount) return false;
            const r = sel.getRangeAt(0);
            const node = r.startContainer, offset = r.startOffset;
            if (node.nodeType !== 3 || offset === 0) return false;
            return /[a-zA-Z]/.test(node.textContent.charAt(offset - 1));
        }
        function insertFuncF() {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const letter = document.createElement('i'); letter.className = 'math-symbol'; letter.textContent = 'f';
            const primes = document.createElement('span'); primes.className = 'func-primes';
            const suffix = document.createElement('span'); suffix.className = 'math-function-argument'; suffix.textContent = '(x)';
            const landing = document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL);
            const frag = document.createDocumentFragment();
            frag.appendChild(letter); frag.appendChild(primes); frag.appendChild(suffix); frag.appendChild(landing);
            range.insertNode(frag);
            const after = document.createRange();
            after.setStart(landing, 1); after.collapse(true);
            sel.removeAllRanges(); sel.addRange(after);
            funcPrimeLanding = landing; funcPrimeSpan = primes;
        }

        let pendingIntegral = false;
        function growLimitBoxes() {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            const limitsWrap = document.createElement('span'); limitsWrap.className = 'int-limits';
            const upper = document.createElement('span'); upper.className = 'int-upper'; upper.appendChild(document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL));
            const lower = document.createElement('span'); lower.className = 'int-lower'; lower.appendChild(document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL));
            limitsWrap.appendChild(upper); limitsWrap.appendChild(lower);
            const landing = document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL);
            const frag = document.createDocumentFragment();
            frag.appendChild(limitsWrap); frag.appendChild(landing);
            range.insertNode(frag);
            const inner = document.createRange();
            inner.setStart(upper.firstChild, 1); inner.collapse(true);
            sel.removeAllRanges(); sel.addRange(inner);
        }
        function currentIntLimitZone() {
            const sel = window.getSelection();
            if (!sel.rangeCount) return null;
            let node = sel.getRangeAt(0).startContainer;
            while (node && node !== editor) {
                if (node.nodeType === 1 && (node.className === 'int-upper' || node.className === 'int-lower')) return node;
                node = node.parentNode;
            }
            return null;
        }
        function exitIntLimits(lowerZoneEl) {
            const limitsWrap = lowerZoneEl.parentNode;
            const landing = limitsWrap.nextSibling;
            const sel = window.getSelection();
            const range = document.createRange();
            if (landing && landing.nodeType === 3) range.setStart(landing, landing.textContent.length);
            else range.setStartAfter(limitsWrap);
            range.collapse(true);
            sel.removeAllRanges(); sel.addRange(range);
        }
        // nth root: Caps Lock + ~
        function insertRootWithIndex() {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const wrapEl = document.createElement('span'); wrapEl.className = 'root-n';
            const idx = document.createElement('span'); idx.className = 'root-index';
            idx.appendChild(document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL));
            const sym = document.createElement('i'); sym.className = 'math-symbol'; sym.textContent = '√';
            wrapEl.appendChild(idx); wrapEl.appendChild(sym);
            const landing = document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL);
            const frag = document.createDocumentFragment();
            frag.appendChild(wrapEl); frag.appendChild(landing);
            range.insertNode(frag);
            const inner = document.createRange();
            inner.setStart(idx.firstChild, 1); inner.collapse(true);
            sel.removeAllRanges(); sel.addRange(inner);
        }
        function closestClass(cls) {
            const sel = window.getSelection();
            if (!sel.rangeCount) return null;
            let node = sel.getRangeAt(0).startContainer;
            while (node && node !== editor) {
                if (node.nodeType === 1 && node.classList && node.classList.contains(cls)) return node;
                node = node.parentNode;
            }
            return null;
        }
        function caretAfterNode(el) {
            let landing = el.nextSibling;
            if (!landing || landing.nodeType !== 3) { landing = document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL); el.parentNode.insertBefore(landing, el.nextSibling); }
            const sel = window.getSelection();
            const r = document.createRange();
            r.setStart(landing, Math.min(1, landing.textContent.length)); r.collapse(true);
            sel.removeAllRanges(); sel.addRange(r);
        }
        // matrix: Shift + M, then (rows*columns)
        function insertMatrixSpec() {
            const sel = window.getSelection();
            if (!sel.rangeCount) return;
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const spec = document.createElement('span'); spec.className = 'matrix-spec';
            const text = document.createTextNode('(*)');
            spec.appendChild(text);
            range.insertNode(spec);
            const inner = document.createRange();
            inner.setStart(text, 1); inner.collapse(true);
            sel.removeAllRanges(); sel.addRange(inner);
        }
        function buildMatrix(rows, cols) {
            const mx = document.createElement('span'); mx.className = 'mx';
            mx.dataset.rows = rows; mx.dataset.cols = cols;
            const grid = document.createElement('span'); grid.className = 'mx-grid';
            grid.style.gridTemplateColumns = `repeat(${cols}, auto)`;
            for (let i = 0; i < rows * cols; i++) {
                const cell = document.createElement('span'); cell.className = 'mx-cell';
                cell.appendChild(document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL));
                grid.appendChild(cell);
            }
            mx.appendChild(grid);
            return mx;
        }
        // Turns "(3*3)" into a 3 by 3 grid; anything else is left as plain text.
        function convertMatrixSpec(spec) {
            const sel = window.getSelection();
            const m = /^\((\d{1,2})\*(\d{1,2})\)$/.exec(spec.textContent.replace(/\u200b/g, ''));
            const rows = m ? Number(m[1]) : 0, cols = m ? Number(m[2]) : 0;
            if (!m || rows < 1 || cols < 1 || rows > 8 || cols > 8) {
                const plain = document.createTextNode(spec.textContent.replace('*', '×'));
                spec.replaceWith(plain);
                const r = document.createRange(); r.setStart(plain, plain.textContent.length); r.collapse(true);
                sel.removeAllRanges(); sel.addRange(r);
                return;
            }
            const mx = buildMatrix(rows, cols);
            const landing = document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL);
            spec.replaceWith(mx);
            mx.parentNode.insertBefore(landing, mx.nextSibling);
            const first = mx.querySelector('.mx-cell').firstChild;
            const r = document.createRange(); r.setStart(first, 1); r.collapse(true);
            sel.removeAllRanges(); sel.addRange(r);
        }
        function caretEdgeInCell(cell, atEnd) {
            const sel = window.getSelection();
            if (!sel.rangeCount || !sel.isCollapsed) return false;
            const r = document.createRange();
            r.selectNodeContents(cell);
            const caret = sel.getRangeAt(0);
            if (atEnd) r.setStart(caret.startContainer, caret.startOffset); else r.setEnd(caret.startContainer, caret.startOffset);
            return r.toString().replace(/\u200b/g, '') === '';
        }
        function focusCell(cell, atEnd) {
            cell.normalize && cell.normalize();
            let t = cell.firstChild;
            if (!t) { t = document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL); cell.appendChild(t); }
            const sel = window.getSelection();
            const r = document.createRange();
            if (t.nodeType === 3) r.setStart(t, atEnd ? t.textContent.length : Math.min(1, t.textContent.length));
            else r.setStart(cell, atEnd ? cell.childNodes.length : 0);
            r.collapse(true);
            sel.removeAllRanges(); sel.addRange(r);
        }
        // Returns true when the key was handled as matrix navigation.
        function handleMatrixCellKey(ev) {
            const cell = closestClass('mx-cell');
            if (!cell || ev.ctrlKey || ev.metaKey || ev.altKey) return false;
            const mx = cell.closest('.mx');
            const cells = Array.from(mx.querySelectorAll('.mx-cell'));
            const i = cells.indexOf(cell);
            const cols = Number(mx.dataset.cols) || 1;
            const go = (target, atEnd) => { ev.preventDefault(); focusCell(target, atEnd); return true; };
            const leave = () => { ev.preventDefault(); caretAfterNode(mx); return true; };
            if (ev.key === 'Tab') {
                if (ev.shiftKey) return i > 0 ? go(cells[i - 1], true) : false;
                return i < cells.length - 1 ? go(cells[i + 1], false) : leave();
            }
            if (ev.key === 'ArrowRight' && caretEdgeInCell(cell, true)) return i < cells.length - 1 ? go(cells[i + 1], false) : leave();
            if (ev.key === 'ArrowLeft' && caretEdgeInCell(cell, false) && i > 0) return go(cells[i - 1], true);
            if (ev.key === 'ArrowDown' && i + cols < cells.length) return go(cells[i + cols], true);
            if (ev.key === 'ArrowUp' && i - cols >= 0) return go(cells[i - cols], true);
            if (ev.key === 'Enter') return i < cells.length - 1 ? go(cells[i + 1], false) : leave();
            return false;
        }
        // Keys typed inside the "(*)" size prompt.
        function handleMatrixSpecKey(ev) {
            const spec = closestClass('matrix-spec');
            if (!spec) return false;
            if (ev.ctrlKey || ev.metaKey || ev.altKey) return false;
            const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
            if (allowed.includes(ev.key)) return false;
            if (/^[0-9]$/.test(ev.key)) return false;
            ev.preventDefault();
            if (ev.key === '*') {
                const node = spec.firstChild;
                const at = node.textContent.indexOf('*');
                const sel = window.getSelection();
                if (at >= 0 && node.nodeType === 3) {
                    const r = document.createRange(); r.setStart(node, at + 1); r.collapse(true);
                    sel.removeAllRanges(); sel.addRange(r);
                }
                return true;
            }
            if (ev.key === ')' || ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Tab') { convertMatrixSpec(spec); return true; }
            return true; // swallow any other key inside the size prompt
        }
        function maybeConvertTwoChar() {
            const sel = window.getSelection();
            if (!sel.rangeCount || !sel.isCollapsed) return;
            const node = sel.getRangeAt(0).startContainer;
            const offset = sel.getRangeAt(0).startOffset;
            if (node.nodeType !== 3 || offset < 2) return;
            const last2 = node.textContent.slice(offset - 2, offset);
            const symbol = MATH_SHORTCUT_TWO_CHAR_GLOBAL[last2];
            if (!symbol) return;
            node.textContent = node.textContent.slice(0, offset - 2) + symbol + node.textContent.slice(offset);
            const range = document.createRange();
            range.setStart(node, offset - 1); range.collapse(true);
            sel.removeAllRanges(); sel.addRange(range);
        }
        // Ctrl + minus: a bar over the letter, symbol or bracketed group just before the cursor (x̄: a mean, an exogenous variable), or over the
        // selected text. Press it again with the cursor straight after the barred part to take the bar off.
        function toggleBar() {
            const sel = window.getSelection();
            if (!sel.rangeCount || !editor.contains(sel.anchorNode)) return false;
            const rg = sel.getRangeAt(0);
            const barOf = (n) => { while (n && n !== editor) { if (n.nodeType === 1 && n.classList && n.classList.contains('math-bar')) return n; n = n.parentNode; } return null; };
            const unwrap = (b) => { const par = b.parentNode, first = b.firstChild, last = b.lastChild; while (b.firstChild) par.insertBefore(b.firstChild, b); par.removeChild(b); return [first, last]; };
            const landAfter = (el) => {
                let tail = el.nextSibling;
                if (!tail || tail.nodeType !== 3) { tail = document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL); el.parentNode.insertBefore(tail, el.nextSibling); }
                else if (tail.textContent === '') tail.textContent = MATH_SHORTCUT_ZWS_GLOBAL;
                const c = document.createRange(); c.setStart(tail, tail.textContent.charAt(0) === MATH_SHORTCUT_ZWS_GLOBAL ? 1 : 0); c.collapse(true);
                sel.removeAllRanges(); sel.addRange(c);
            };
            const wrapRange = (r) => { const span = document.createElement('span'); span.className = 'math-bar'; span.appendChild(r.extractContents()); r.insertNode(span); landAfter(span); return true; };
            if (!sel.isCollapsed) {
                const ex = barOf(rg.commonAncestorContainer);
                if (ex) { unwrap(ex); return true; }
                return wrapRange(rg);
            }
            const here = barOf(rg.startContainer);
            if (here) { const pair = unwrap(here); const last = pair[1]; if (last) { const c = document.createRange(); c.setStartAfter(last); c.collapse(true); sel.removeAllRanges(); sel.addRange(c); } return true; }
            const node = rg.startContainer, off = rg.startOffset;
            let target = null;
            if (node.nodeType === 3) {
                let i = off; while (i > 0 && node.textContent.charAt(i - 1) === MATH_SHORTCUT_ZWS_GLOBAL) i--;
                if (i > 0) {
                    const ch = node.textContent.charAt(i - 1);
                    if (/\s/.test(ch)) return false;
                    // the word: the run of letters and digits before the cursor, together with any Greek letters or symbols joined to it
                    const isWord = (c) => /[A-Za-z0-9\u0370-\u03ff'\u2019\u2032\u2033]/.test(c);
                    if (isWord(ch)) {
                        let j = i; while (j > 0 && isWord(node.textContent.charAt(j - 1))) j--;
                        let startNode = node, startOff = j;
                        if (j === 0) {
                            let prev = node.previousSibling;
                            while (prev) {
                                if (prev.nodeType === 3 && !prev.textContent.replace(/\u200B/g, '')) { prev = prev.previousSibling; continue; }
                                if (prev.nodeType === 1 && prev.classList.contains('math-symbol')) { startNode = prev.parentNode; startOff = Array.prototype.indexOf.call(prev.parentNode.childNodes, prev); prev = prev.previousSibling; continue; }
                                if (prev.nodeType === 3) {
                                    const t = prev.textContent; let k = t.length; while (k > 0 && isWord(t.charAt(k - 1))) k--;
                                    if (k < t.length) { startNode = prev; startOff = k; if (k === 0) { prev = prev.previousSibling; continue; } }
                                }
                                break;
                            }
                        }
                        const wr = document.createRange(); wr.setStart(startNode, startOff); wr.setEnd(node, i);
                        return wrapRange(wr);
                    }
                    const after = node.textContent.slice(i);
                    node.textContent = node.textContent.slice(0, i - 1);
                    const span = document.createElement('span'); span.className = 'math-bar'; span.textContent = ch;
                    node.parentNode.insertBefore(span, node.nextSibling);
                    if (after) node.parentNode.insertBefore(document.createTextNode(after), span.nextSibling);
                    landAfter(span);
                    return true;
                }
                target = node.previousSibling;
            } else target = node.childNodes[off - 1] || null;
            while (target && target.nodeType === 3 && !target.textContent.replace(/\u200B/g, '')) target = target.previousSibling;
            if (!target || target.nodeType !== 1) return false;
            // straight after a barred part: a second press takes the bar off
            if (target.classList.contains('math-bar')) { const pr = unwrap(target); const lastN = pr[1]; if (lastN) { const c0 = document.createRange(); c0.setStartAfter(lastN); c0.collapse(true); sel.removeAllRanges(); sel.addRange(c0); } return true; }
            // a bracketed group: bar the whole of it
            if (target.classList.contains('math-bracket') && target.textContent === ')') {
                let depth = 0, open = null;
                for (let n = target; n; n = n.previousSibling) {
                    if (n.nodeType === 1 && n.classList.contains('math-bracket')) {
                        if (n.textContent === ')') depth++;
                        else if (n.textContent === '(') { depth--; if (depth === 0) { open = n; break; } }
                    }
                }
                if (open) { const r = document.createRange(); r.setStartBefore(open); r.setEndAfter(target); return wrapRange(r); }
            }
            const r2 = document.createRange(); r2.selectNode(target);
            return wrapRange(r2);
        }
        // The bar belongs to the one word it was put on: when the cursor is at the very end of a barred word, whatever is typed next starts
        // outside it (browsers otherwise tend to carry the formatting of the last character on to the next ones).
        function leaveBarAtEnd() {
            const sel = window.getSelection();
            if (!sel.rangeCount || !sel.isCollapsed) return;
            const rg = sel.getRangeAt(0);
            let bar = rg.startContainer.nodeType === 1 ? rg.startContainer : rg.startContainer.parentNode;
            while (bar && bar !== editor && !(bar.classList && bar.classList.contains('math-bar'))) bar = bar.parentNode;
            if (!bar || bar === editor) return;
            const rest = document.createRange(); rest.selectNodeContents(bar); rest.setStart(rg.startContainer, rg.startOffset);
            if (rest.toString().replace(/\u200B/g, '') !== '') return;       // the cursor is inside the word: keep the bar
            let tail = bar.nextSibling;
            if (!tail || tail.nodeType !== 3) { tail = document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL); bar.parentNode.insertBefore(tail, bar.nextSibling); }
            const c = document.createRange(); c.setStart(tail, tail.textContent.charAt(0) === MATH_SHORTCUT_ZWS_GLOBAL ? 1 : 0); c.collapse(true);
            sel.removeAllRanges(); sel.addRange(c);
        }
        // ----- automatic mode: is the cursor in maths or in ordinary writing?
        function lineBeforeCaret() {
            const sel = window.getSelection();
            if (!sel.rangeCount) return '';
            const r = sel.getRangeAt(0);
            let line = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentNode;
            while (line && line !== editor && !(line.nodeType === 1 && /^(DIV|P|LI|H1|H2)$/.test(line.tagName))) line = line.parentNode;
            if (!line) line = editor;
            const pre = document.createRange(); pre.selectNodeContents(line); pre.setEnd(r.startContainer, r.startOffset);
            return pre.toString().replace(/\u200b/g, '');
        }
        const MATH_OPS = '=+−-×÷<>≤≥≠≈≡^_/*|,';
        // (Greek letters, such as α and π, are symbols too: a power or a subscript can follow them)
        const isSymbolChar = (c) => !!c && (c.charCodeAt(0) > 0x2000 || /[\u0370-\u03ff]/.test(c)) && !/[“”‘’…—–•]/.test(c);
        // True when a key that is also a plain letter or sign in English should be treated as maths: inside a power, fraction, root or matrix,
        // straight after a number, a maths sign, a Greek letter or a lowercase letter (sinθ), or after a maths sign and a space (x = α).
        // At the start of a line, after a word and a space, after a capital letter (GDP, UK) or after sentence punctuation it is ordinary writing.
        function mathsContext() {
            if (currentZone() || currentFracPart() || closestClass('root-radicand') || closestClass('root-index') || currentIntLimitZone() || closestClass('mx-cell')) return true;
            const t = lineBeforeCaret();
            if (!t) return false;
            const last = t.slice(-1);
            if (last === ' ' || last === '\u00a0') {
                const before = t.replace(/[\s\u00a0]+$/, '').slice(-1);
                return !!before && (MATH_OPS.indexOf(before) >= 0 || isSymbolChar(before));
            }
            if (/[0-9a-z]/.test(last)) return true;
            if (MATH_OPS.indexOf(last) >= 0 || isSymbolChar(last)) return true;
            if (last === '(' || last === '[') return /[A-Za-z0-9)]/.test(t.slice(-2, -1) || '');
            return false;
        }
        // ----- autocorrect (Notes page only): see NOTES_AUTOCORRECT_WORDS
        let lastFix = null;
        const fixIgnored = new Set();
        const AC_BOUNDARY = [' ', '.', ',', ';', ':', '!', '?', ')', 'Enter'];
        function autocorrectedWord(word) {
            const lower = word.toLowerCase();
            if (fixIgnored.has(lower) || nbAcIgnored.has(lower)) return null;
            let rep = NOTES_AUTOCORRECT_WORDS[lower];
            if (rep) {
                if (word.length > 1 && word === word.toUpperCase()) return rep.toUpperCase();
                if (word.charAt(0) !== word.charAt(0).toLowerCase()) return rep.charAt(0).toUpperCase() + rep.slice(1);
                return rep;
            }
            // two capitals then ordinary lower case (a held Shift): THen -> Then
            if (/^[A-Z]{2}[a-z]{2,}$/.test(word)) return word.charAt(0) + word.slice(1).toLowerCase();
            // a word one slip away from exactly one real word (fucntion -> function). Names and acronyms (a capital letter anywhere) are left alone,
            // and so is a word that is already written more than once on the page.
            if (/^[a-z]+$/.test(word) && nbDict) {
                const host = document.getElementById('nbCanvas');
                const used = host ? (host.textContent || '').toLowerCase().split(/[^a-z']+/).filter((x) => x === lower).length : 1;
                if (used <= 1) return nbDictCorrect(lower);
            }
            return null;
        }
        function tryAutocorrect() {
            const sel = window.getSelection();
            if (!sel.rangeCount || !sel.isCollapsed) return;
            const r = sel.getRangeAt(0), node = r.startContainer, off = r.startOffset;
            if (node.nodeType !== 3) return;
            if (currentZone() || currentFracPart() || closestClass('root-radicand') || closestClass('root-index') || currentIntLimitZone() || closestClass('mx-cell')) return;
            const before = node.textContent.slice(0, off), m = /([A-Za-z]+)$/.exec(before);
            if (!m) return;
            const word = m[1], start = off - word.length, prev = before.charAt(start - 1);
            if (prev && /[A-Za-z0-9^_\/\\*+=<>−×÷′'’\u0370-\u03ff]/.test(prev)) return;   // part of a longer token or of maths
            if (start === 0 && node.previousSibling && node.previousSibling.nodeType === 1 && !/^(BR|DIV|P|LI)$/.test(node.previousSibling.tagName)) return;
            const fixed = autocorrectedWord(word);
            if (!fixed || fixed === word) return;
            node.nodeValue = before.slice(0, start) + fixed + node.textContent.slice(off);
            const caret = document.createRange(); caret.setStart(node, start + fixed.length); caret.collapse(true);
            sel.removeAllRanges(); sel.addRange(caret);
            lastFix = { node, start, fixed, original: word, expect: start + fixed.length + 1 };
        }
        // Backspace straight after a correction puts back what was typed, and that word is left alone from then on.
        function undoAutocorrect() {
            if (!lastFix) return false;
            const sel = window.getSelection();
            if (!sel.rangeCount || !sel.isCollapsed) { lastFix = null; return false; }
            const r = sel.getRangeAt(0), f = lastFix;
            if (r.startContainer !== f.node || r.startOffset !== f.expect || f.node.textContent.substr(f.start, f.fixed.length) !== f.fixed) { lastFix = null; return false; }
            const text = f.node.textContent;
            f.node.nodeValue = text.slice(0, f.start) + f.original + text.slice(f.start + f.fixed.length);
            const caret = document.createRange(); caret.setStart(f.node, f.start + f.original.length + 1); caret.collapse(true);
            sel.removeAllRanges(); sel.addRange(caret);
            fixIgnored.add(f.original.toLowerCase()); nbAcIgnore(f.original.toLowerCase());
            lastFix = null;
            return true;
        }
        const afterOperand = () => /[A-Za-z0-9)\]′″]$/.test(lineBeforeCaret()) || isSymbolChar(lineBeforeCaret().slice(-1));
        editor.addEventListener('keydown', (ev) => {
            if (ev.key && ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) leaveBarAtEnd();
            if (auto && typeof opts.autocorrect === 'function') {
                if (ev.key === 'Backspace' && !ev.ctrlKey && !ev.metaKey && !ev.altKey && lastFix && undoAutocorrect()) { ev.preventDefault(); return; }
                if (AC_BOUNDARY.indexOf(ev.key) >= 0 && !ev.ctrlKey && !ev.metaKey && !ev.altKey && opts.autocorrect()) { lastFix = null; nbLoadDictionary(); tryAutocorrect(); }
                else if (!/^(Shift|Control|Alt|Meta|CapsLock)$/.test(ev.key)) lastFix = null;
            }
            // "#" always toggles the mode, in either mode, and is never
            // itself inserted. Clears any in-flight maths state (a pending
            // prime-chain or integral-limits trigger) so switching modes
            // mid-expression can never leave stale state to misfire once
            // the student switches back.
            if (ev.key === '#' && !auto) {
                ev.preventDefault();
                writingMode = !writingMode;
                funcPrimeLanding = null; funcPrimeSpan = null; pendingIntegral = false;
                updateModeBadge();
                return;
            }

            if (writingMode) {
                // English text can be entered inside a square root. At the
                // right edge, Right Arrow/Tab leaves the root instead of
                // extending its overbar into the text that follows.
                const writingRoot = closestClass('root-radicand');
                if (writingRoot && (ev.key === 'ArrowRight' || ev.key === 'Tab')) {
                    const selection = window.getSelection();
                    if (selection.rangeCount && selection.isCollapsed) {
                        const remainder = document.createRange(); remainder.selectNodeContents(writingRoot);
                        const caret = selection.getRangeAt(0); remainder.setStart(caret.startContainer, caret.startOffset);
                        if (!remainder.toString().replace(/\u200b/g, '')) { ev.preventDefault(); caretAfterNode(writingRoot.parentNode); }
                    }
                }
                return; // otherwise plain typing behaves like an ordinary textarea.
            }
            if (ev.key === 'Enter' && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey && !ev.altKey) mathsClearClonedAlign(editor);
            if (ev.key === ' ' && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey && !ev.altKey && mathsAlignToEquals(editor)) { ev.preventDefault(); return; }

            // Inside the matrix size prompt "(*)", only digits / * / ) are meaningful.
            if (handleMatrixSpecKey(ev)) return;

            const extendingPrimes = funcPrimeLanding && ev.key === "'" && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey && !ev.altKey && isCaretAt(funcPrimeLanding, 1);
            if (extendingPrimes) {
                ev.preventDefault();
                funcPrimeSpan.textContent += '′';
                const afterPrime = document.createRange();
                afterPrime.setStart(funcPrimeLanding, 1); afterPrime.collapse(true);
                const selPrime = window.getSelection();
                selPrime.removeAllRanges(); selPrime.addRange(afterPrime);
                return;
            }
            funcPrimeLanding = null; funcPrimeSpan = null;

            if (pendingIntegral) {
                pendingIntegral = false;
                if (ev.key === 'd' && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey && !ev.altKey) { ev.preventDefault(); growLimitBoxes(); return; }
            }
            if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && !ev.shiftKey && (ev.key === '-' || ev.code === 'Minus')) { if (toggleBar()) { ev.preventDefault(); editor.dispatchEvent(new Event('input', { bubbles: true })); return; } }
            // A closing bracket only adds the limits of a definite integral when its opening bracket comes after an integral sign on the same line:
            // brackets anywhere else are just brackets.
            const bracketLooksMaths = () => {
                const t = lineBeforeCaret(), i = t.lastIndexOf('[');
                return i >= 0 && t.slice(0, i).indexOf('∫') >= 0;
            };
            if (ev.key === ']' && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey && !ev.altKey && bracketLooksMaths()) {
                ev.preventDefault(); insertTextAtCaret(']'); growLimitBoxes(); return;
            }
            // Shift + a letter: a Greek letter, an integral, a matrix or f(x) in maths; just a capital letter in ordinary writing. Alt + Shift always
            // gives the maths one.
            const keyLetter = ev.code && /^Key[A-Z]$/.test(ev.code) ? ev.code.slice(3).toLowerCase() : String(ev.key || '').toLowerCase();
            const shiftLetter = ev.shiftKey && !ev.ctrlKey && !ev.metaKey && (!ev.altKey || auto) && keyLetter.length === 1;
            // Selecting the maths keyboard is an explicit instruction. Do
            // not second-guess it from the surrounding prose: Shift+letter
            // must work at the start of a line and after ordinary words too.
            const wantsMaths = true;
            // "c " then Shift+E is the element-of sign, even though a letter and a space would otherwise read as ordinary writing
            const afterVariable = keyLetter === 'e' && /(^|[^A-Za-z])[A-HJ-Za-z]\s$/.test(lineBeforeCaret()) && !/(^|[^A-Za-z])a\s$/.test(lineBeforeCaret());
            if (shiftLetter && (wantsMaths || afterVariable)) {
                const lower = keyLetter;
                if (lower === 'e') { ev.preventDefault(); insertStyledSymbol('∈'); return; }
                if (MATH_SHORTCUT_GREEK_MAP_GLOBAL[lower]) {
                    ev.preventDefault();
                    const capsOn = ev.getModifierState && ev.getModifierState('CapsLock');
                    insertStyledSymbol(capsOn ? MATH_SHORTCUT_GREEK_MAP_GLOBAL[lower].upper : MATH_SHORTCUT_GREEK_MAP_GLOBAL[lower].lower);
                    return;
                }
                if (lower === 'i') { ev.preventDefault(); insertStyledSymbol('∫'); pendingIntegral = true; return; }
                if (auto && lower === 'f') { ev.preventDefault(); insertFuncF(); return; }
            }
            // a capital F at the start of a word, then "(": f(x)
            if (auto && ev.key === '(' && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
                const selF = window.getSelection();
                if (selF.rangeCount && selF.isCollapsed) {
                    const rF = selF.getRangeAt(0), nF = rF.startContainer, oF = rF.startOffset;
                    if (nF.nodeType === 3 && oF > 0 && nF.textContent.charAt(oF - 1) === 'F' && (oF === 1 || /[\s\u200b=+\-−×÷(\[,]/.test(nF.textContent.charAt(oF - 2)))) {
                        ev.preventDefault();
                        nF.textContent = nF.textContent.slice(0, oF - 1) + nF.textContent.slice(oF);
                        const back = document.createRange(); back.setStart(nF, oF - 1); back.collapse(true); selF.removeAllRanges(); selF.addRange(back);
                        insertFuncF();
                        return;
                    }
                }
            }
            if (!auto && ev.key === 'f' && !ev.shiftKey && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !precedingCharIsLetter()) { ev.preventDefault(); insertFuncF(); return; }
            if (ev.key === '*' && (!auto || afterOperand())) { ev.preventDefault(); insertStyledSymbol('×'); return; }
            if (ev.key === '~' && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
                const radDouble = closestClass('root-radicand'), rootDouble = radDouble && radDouble.parentNode;
                if (rootDouble && rootDouble.className === 'root' && !rootDouble.querySelector('.root-index') && !radDouble.textContent.replace(/\u200b/g, '')) {
                    ev.preventDefault();
                    const selD = window.getSelection(), rD = document.createRange(); rD.setStartBefore(rootDouble); rD.collapse(true);
                    rootDouble.parentNode.removeChild(rootDouble); selD.removeAllRanges(); selD.addRange(rD);
                    insertStyledSymbol('≈'); return;
                }
            }
            if (ev.key === '~' && (!auto || (lineBeforeCaret() && mathsContext()))) {
                ev.preventDefault();
                const capsOn = ev.getModifierState && ev.getModifierState('CapsLock');
                if (capsOn) insertRootWithIndex(); else insertSquareRoot();
                return;
            }
            if (ev.key === '(' || ev.key === ')') { ev.preventDefault(); insertMathBracket(ev.key); return; }
            if (ev.shiftKey && !ev.ctrlKey && !ev.metaKey && (!ev.altKey || auto) && keyLetter === 'm' && (!auto || wantsMaths)) { ev.preventDefault(); insertMatrixSpec(); return; }
            if (ev.key === '^' && (!auto || afterOperand())) { ev.preventDefault(); startZone('sup'); return; }
            if (ev.key === '_' && (!auto || afterOperand())) { ev.preventDefault(); startZone('sub'); return; }
            const slashIsMaths = () => { const t = lineBeforeCaret(); return /[0-9)\]]$/.test(t) || isSymbolChar(t.slice(-1)) || /(^|[^A-Za-z])[A-Za-z]{1,2}$/.test(t); };
            if (ev.key === '/' && (!auto || currentFracPart() || slashIsMaths())) {
                const fracPart = currentFracPart();
                if (fracPart && fracPart.className === 'frac-num') { ev.preventDefault(); advanceFracNumToDen(fracPart); return; }
                if (fracPart && fracPart.className === 'frac-den') return;
                ev.preventDefault();
                if (mathsFractionFromBrackets(editor) || mathsFractionFromAnyBrackets(editor)) return;
                const token = findTokenBeforeCaret();
                if (token) {
                    const numerator = token.range.extractContents();
                    const sel0 = window.getSelection();
                    sel0.removeAllRanges(); sel0.addRange(token.range);
                    makeFraction(numerator);
                } else { makeFraction(null); }
                return;
            }
            const rootIndex = closestClass('root-index');
            if (rootIndex && (ev.key === 'ArrowRight' || ev.key === ' ' || ev.key === 'Tab')) {
                ev.preventDefault();
                rootIndex.normalize && rootIndex.normalize();
                const zw = rootIndex.firstChild;
                if (zw && zw.nodeType === 3 && zw.textContent.length > 1 && zw.textContent.charAt(0) === MATH_SHORTCUT_ZWS_GLOBAL) zw.textContent = zw.textContent.slice(1);
                caretAfterNode(rootIndex.parentNode);
                return;
            }
            const rootRadicand = closestClass('root-radicand');
            if (rootRadicand && (ev.key === 'ArrowRight' || ev.key === 'Tab')) {
                ev.preventDefault(); caretAfterNode(rootRadicand.parentNode); return;
            }
            const zone = currentZone();
            if (zone && (ev.key === 'ArrowRight' || ev.key === ' ')) { ev.preventDefault(); exitZoneAfter(zone); return; }
            const denPart = currentFracPart();
            if (denPart && denPart.className === 'frac-den' && (ev.key === 'ArrowRight' || ev.key === ' ')) { ev.preventDefault(); exitZoneAfter(denPart.parentNode); return; }
            if (!zone && !denPart && handleMatrixCellKey(ev)) return;
            const intZone = currentIntLimitZone();
            if (intZone && intZone.className === 'int-upper' && ev.key === 'ArrowDown') {
                ev.preventDefault();
                const lowerZone = intZone.parentNode.querySelector('.int-lower');
                lowerZone.normalize && lowerZone.normalize();
                const toLower = document.createRange();
                toLower.setStart(lowerZone.firstChild, lowerZone.firstChild.textContent.length); toLower.collapse(true);
                const selDown = window.getSelection();
                selDown.removeAllRanges(); selDown.addRange(toLower);
                return;
            }
            if (intZone && intZone.className === 'int-lower' && ev.key === ' ') { ev.preventDefault(); exitIntLimits(intZone); return; }
        });
        editor.addEventListener('input', () => { if (!writingMode) maybeConvertTwoChar(); });
        // Text typed straight after a barred word goes outside the bar. The browser would otherwise treat the position just after the bar's last
        // letter as part of it, so the text is placed by hand.
        editor.addEventListener('beforeinput', (e) => {
            if (e.inputType !== 'insertText' || !e.data || e.isComposing) return;
            const sel = window.getSelection();
            if (!sel.rangeCount || !sel.isCollapsed) return;
            const rg = sel.getRangeAt(0), node = rg.startContainer;
            let tail = null, at = 0;
            const isBar = (n) => n && n.nodeType === 1 && n.classList && n.classList.contains('math-bar');
            if (node.nodeType === 3 && !node.parentNode.closest('.math-bar')) {
                if (node.textContent.slice(0, rg.startOffset).replace(/​/g, '') === '') {
                    let prev = node.previousSibling;
                    while (prev && prev.nodeType === 3 && !prev.textContent.replace(/​/g, '')) prev = prev.previousSibling;
                    if (isBar(prev)) { tail = node; at = rg.startOffset; }
                }
            } else {
                let bar = node.nodeType === 1 ? node : node.parentNode;
                while (bar && bar !== editor && !isBar(bar)) bar = bar.parentNode;
                if (bar && bar !== editor) {
                    const rest = document.createRange(); rest.selectNodeContents(bar); rest.setStart(node, rg.startOffset);
                    if (rest.toString().replace(/​/g, '') === '') {
                        tail = bar.nextSibling;
                        if (!tail || tail.nodeType !== 3) { tail = document.createTextNode(MATH_SHORTCUT_ZWS_GLOBAL); bar.parentNode.insertBefore(tail, bar.nextSibling); }
                        at = tail.textContent.charAt(0) === MATH_SHORTCUT_ZWS_GLOBAL ? 1 : 0;
                    }
                }
            }
            if (!tail) return;
            e.preventDefault();
            tail.insertData(at, e.data);
            const c = document.createRange(); c.setStart(tail, at + e.data.length); c.collapse(true);
            sel.removeAllRanges(); sel.addRange(c);
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        });
        editor.addEventListener('copy', (ev) => { nbMathCopy(ev, false, editor); });
        editor.addEventListener('cut', (ev) => { nbMathCopy(ev, true, editor); });
        // Pasting is welcome here: maths copied from LastMind keeps its form, text that is written as maths is drawn as maths, and anything else is
        // plain text only (no pasted styling).
        editor.addEventListener('paste', (ev) => {
            ev.preventDefault();
            const cd = ev.clipboardData || window.clipboardData;
            const html = cd.getData('text/html');
            if (html && html.indexOf('data-lm-maths') >= 0) {
                document.execCommand('insertHTML', false, nbSanitizeMathHtml(html) + MATH_SHORTCUT_ZWS_GLOBAL);
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                return;
            }
            const text = cd.getData('text/plain');
            if (!text) return;
            if (nbLooksLikeMaths(text)) {
                document.execCommand('insertHTML', false, nbMathInline(text, { markdown: false }).replace(/\n/g, '<br>') + MATH_SHORTCUT_ZWS_GLOBAL);
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                return;
            }
            insertTextAtCaret(text);
        });

        function serializeNode(node) {
            if (node.nodeType === 3) return node.textContent.replace(/​/g, '');
            if (node.nodeType !== 1) return '';
            if (node.classList && node.classList.contains('frac')) {
                const num = serializeChildren(node.querySelector('.frac-num'));
                const den = serializeChildren(node.querySelector('.frac-den'));
                if (!num && !den) return ''; // never-filled-in fraction — emit nothing, not "()/()"
                return `(${num})/(${den})`;
            }
            if (node.classList && node.classList.contains('int-limits')) {
                const upper = serializeChildren(node.querySelector('.int-upper'));
                const lower = serializeChildren(node.querySelector('.int-lower'));
                if (!upper && !lower) return ''; // never-filled-in limits box — emit nothing, not "[, ]"
                return `[${lower}, ${upper}]`;
            }
            if (node.tagName === 'SUP') { const inner = serializeChildren(node); return inner ? `^(${inner})` : ''; }
            if (node.tagName === 'SUB') { const inner = serializeChildren(node); return inner ? `_(${inner})` : ''; }
            if (node.classList && node.classList.contains('root-n')) {
                const index = serializeChildren(node.querySelector('.root-index'));
                return index ? `^(${index})√` : '√';
            }
            if (node.classList && node.classList.contains('root')) {
                const radicand = serializeChildren(node.querySelector('.root-radicand'));
                return radicand ? `√(${radicand})` : '√';
            }
            if (node.classList && node.classList.contains('mx')) {
                const cols = Number(node.dataset.cols) || 1;
                const values = Array.from(node.querySelectorAll('.mx-cell')).map((cell) => serializeChildren(cell).trim());
                if (values.every((v) => !v)) return '';
                const rowsOut = [];
                for (let i = 0; i < values.length; i += cols) rowsOut.push(`[${values.slice(i, i + cols).join(', ')}]`);
                return `matrix(${rowsOut.join(', ')})`;
            }
            return serializeChildren(node);
        }
        function serializeChildren(node) {
            if (!node) return '';
            return Array.from(node.childNodes).map(serializeNode).join('');
        }

        return {
            container: wrap,
            setWritingMode(on) { if (auto) return; writingMode = !!on; funcPrimeLanding = null; funcPrimeSpan = null; pendingIntegral = false; updateModeBadge(); },
            isWritingMode() { return auto ? true : writingMode; },
            getValue() { return serializeChildren(editor).trim(); },
            isEmpty() { return !serializeChildren(editor).trim(); },
            focus() { editor.focus(); },
            // Exactly what is on the page, markup included (fractions, powers, roots, matrices), so it can be put back as it was.
            getHtml() { return editor.innerHTML; },
            setHtml(html) { editor.innerHTML = sanitizeEditorHtml(html); },
            // Called (after a short pause is the caller's business) whenever anything in the box changes, including changes the
            // maths shortcuts make directly without a normal keystroke.
            onChange(cb) { new MutationObserver(() => cb()).observe(editor, { childList: true, subtree: true, characterData: true, attributes: false }); editor.addEventListener('input', () => cb()); },
        };
    }

    // Saved editor markup is put back through this: only the kinds of element the editor itself makes, no scripts or event handlers.
    function sanitizeEditorHtml(html) {
        const tpl = document.createElement('template');
        tpl.innerHTML = String(html || '');
        tpl.content.querySelectorAll('script,style,iframe,object,embed,link,meta,form,input,button,textarea,select,img,svg,audio,video,base').forEach((n) => n.remove());
        tpl.content.querySelectorAll('*').forEach((el) => {
            Array.from(el.attributes).forEach((at) => { if (/^on/i.test(at.name) || /javascript:/i.test(at.value)) el.removeAttribute(at.name); });
        });
        return tpl.innerHTML;
    }
    // ----- maths in text (the LastMind panel, the review, the quiz, and pasting)
    // Text arrives as ordinary writing with maths in it: LaTeX between $ signs or \( \), or the shorthand the maths keyboard writes out
    // (x^(2), a_(1), sqrt(x), (a)/(b), 3/4). It is turned into the same fractions, powers and roots the editor draws, so it looks the same
    // everywhere and can be copied into a Notes box and still be maths. Everything is escaped first; the only tags made are the ones below.
    const NB_TEX_SYMBOLS = {
        times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠', approx: '≈', equiv: '≡', sim: '∼', propto: '∝',
        infty: '∞', to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔', leftrightarrow: '↔', in: '∈', notin: '∉',
        subset: '⊂', subseteq: '⊆', cup: '∪', cap: '∩', emptyset: '∅', forall: '∀', exists: '∃', therefore: '∴', sum: '∑', prod: '∏', int: '∫', partial: '∂',
        nabla: '∇', degree: '°', circ: '°', ldots: '…', cdots: '⋯', dots: '…', prime: '′', angle: '∠', perp: '⊥', parallel: '∥',
        alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ',
        lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
        Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
        ln: 'ln', log: 'log', sin: 'sin', cos: 'cos', tan: 'tan', exp: 'exp', lim: 'lim', max: 'max', min: 'min', det: 'det',
        quad: ' ', qquad: '  ', ',': ' ', ';': ' ', ':': ' ', '!': '', ' ': ' ',
    };
    function nbTexToHtml(src) {
        let i = 0;
        const esc = nbAssistE;
        const group = () => {            // one {…} group, or a single token
            while (src[i] === ' ') i += 1;
            if (src[i] === '{') {
                let depth = 0, j = i;
                for (; j < src.length; j += 1) { if (src[j] === '{') depth += 1; else if (src[j] === '}') { depth -= 1; if (depth === 0) break; } }
                const inner = src.slice(i + 1, j); i = j + 1;
                return nbTexToHtml(inner);
            }
            if (src[i] === '\\') { const m = /^\\([A-Za-z]+|.)/.exec(src.slice(i)); if (m) { i += m[0].length; return NB_TEX_SYMBOLS[m[1]] != null ? esc(NB_TEX_SYMBOLS[m[1]]) : esc(m[1]); } }
            const ch = src[i] || ''; i += 1; return esc(ch);
        };
        let out = '';
        while (i < src.length) {
            const c = src[i];
            if (c === '\\') {
                const m = /^\\([A-Za-z]+|.)/.exec(src.slice(i)); if (!m) { i += 1; continue; }
                const name = m[1]; i += m[0].length;
                if (name === 'bar' || name === 'overline') { const x = group(); out += '<span class="math-bar">' + x + '</span>'; }
                else if (name === 'frac' || name === 'dfrac' || name === 'tfrac') { const a = group(), b = group(); out += '<span class="frac"><span class="frac-num">' + a + '</span><span class="frac-den">' + b + '</span></span>'; }
                else if (name === 'sqrt') {
                    let idx = '';
                    if (src[i] === '[') { const j = src.indexOf(']', i); if (j > i) { idx = esc(src.slice(i + 1, j)); i = j + 1; } }
                    const x = group();
                    out += (idx ? '<sup>' + idx + '</sup>' : '') + '<span class="root"><span class="root-symbol">√</span><span class="root-radicand">' + x + '</span></span>';
                } else if (name === 'text' || name === 'mathrm' || name === 'mathbf' || name === 'textbf' || name === 'operatorname' || name === 'mathit') {
                    while (src[i] === ' ') i += 1;
                    if (src[i] === '{') { const j = src.indexOf('}', i); const raw = src.slice(i + 1, j < 0 ? src.length : j); i = (j < 0 ? src.length : j + 1); out += esc(raw); }
                } else if (name === 'left' || name === 'right' || name === 'big' || name === 'Big' || name === 'bigg' || name === 'Bigg') { if (src[i] === '.') i += 1; }
                else if (name === '\\') out += '<br>';
                else if (name === '{' || name === '}' || name === '%' || name === '$' || name === '&' || name === '_' || name === '#') out += esc(name);
                else if (NB_TEX_SYMBOLS[name] != null) out += esc(NB_TEX_SYMBOLS[name]) + (/^(sin|cos|tan|ln|log|exp|lim|max|min|det)$/.test(name) ? ' ' : '');
                else out += esc(name);
            } else if (c === '^') { i += 1; out += '<sup>' + group() + '</sup>'; }
            else if (c === '_') { i += 1; out += '<sub>' + group() + '</sub>'; }
            else if (c === '{') { out += group(); }
            else if (c === '}' || c === '&') { i += 1; }
            else if (c === '~') { out += ' '; i += 1; }
            else { out += esc(c); i += 1; }
        }
        return out;
    }
    // One line of text: maths in LaTeX and in shorthand turned into drawn maths. opts.markdown also handles **bold**, *italic* and `code`.
    function nbMathInline(text, opts) {
        const md = !opts || opts.markdown !== false;
        const keep = [];
        const hold = (html) => { keep.push(html); return '\u0000' + (keep.length - 1) + '\u0000'; };
        let t = String(text == null ? '' : text);
        // LaTeX between delimiters
        t = t.replace(/\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$(?![\s$])([^$\n]+?)(?<![\s\\])\$/g,
            (m, a, b, c, d) => hold('<span class="nb-tex">' + nbTexToHtml(a || b || c || d || '') + '</span>'));
        t = nbAssistE(t);
        if (md) {
            t = t.replace(/`([^`\n]+)`/g, (m, x) => hold('<code>' + x + '</code>'));
            t = t.replace(/\*\*([^*\n]+?)\*\*/g, '<b>$1</b>');
            t = t.replace(/(^|[^*\w])\*(?![\s*])([^*\n]+?)(?<![\s*])\*(?![*\w])/g, '$1<i>$2</i>');
        }
        // shorthand: roots, fractions, powers and subscripts
        t = t.replace(/\bbar\(([^()]*)\)/g, (m, x) => hold('<span class="math-bar">' + x + '</span>'));
        t = t.replace(/(.)\u0304/g, (m, x) => hold('<span class="math-bar">' + x + '</span>'));
        t = t.replace(/(?:sqrt|√)\(([^()]*)\)/gi, (m, x) => hold('<span class="root"><span class="root-symbol">√</span><span class="root-radicand">' + x + '</span></span>'));
        t = t.replace(/\(([^()\n]{1,40})\)\/\(([^()\n]{1,40})\)/g, (m, a, b) => hold('<span class="frac"><span class="frac-num">' + a + '</span><span class="frac-den">' + b + '</span></span>'));
        const fr = (a, b) => hold('<span class="frac"><span class="frac-num">' + a + '</span><span class="frac-den">' + b + '</span></span>');
        // (4/5), (x/2), (3x/4): a fraction written in brackets is drawn as a fraction, without the brackets
        t = t.replace(/\(([0-9]+(?:\.[0-9]+)?[A-Za-z]?|[A-Za-z])\/([0-9]+(?:\.[0-9]+)?[A-Za-z]?|[A-Za-z])\)/g, (m, a, b) => fr(a, b));
        t = t.replace(/\b(d[a-z])\/(d[a-z])\b/g, (m, a, b) => fr(a, b));
        t = t.replace(/(?<![\/\w.])(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?|[a-z])(?![\/\w])/g, (m, a, b) => fr(a, b));
        t = t.replace(/(?<![\/\w.])([a-z])\/(\d+(?:\.\d+)?)(?![\/\w])/g, (m, a, b) => fr(a, b));
        t = t.replace(/\^\(([^()]*)\)/g, '<sup>$1</sup>').replace(/\^\{([^{}]*)\}/g, '<sup>$1</sup>').replace(/\^(-?[A-Za-z0-9.]+)/g, '<sup>$1</sup>');
        t = t.replace(/_\(([^()]*)\)/g, '<sub>$1</sub>').replace(/_\{([^{}]*)\}/g, '<sub>$1</sub>').replace(/(?<=[A-Za-z0-9)Ͱ-Ͽ])_([A-Za-z0-9]{1,3})(?![A-Za-z0-9])/g, '<sub>$1</sub>');
        t = t.replace(/(\d)\s*\*\s*(\d)/g, '$1 × $2').replace(/&lt;=/g, '≤').replace(/&gt;=/g, '≥').replace(/!=/g, '≠').replace(/-&gt;/g, '→');
        return t.replace(/\u0000(\d+)\u0000/g, (m, n) => keep[+n]);
    }
    // A reply as paragraphs, with simple lists and headings.
    function nbMathRich(text) {
        const blocks = String(text == null ? '' : text).replace(/\r/g, '').split(/\n{2,}/);
        return blocks.map((block) => {
            const lines = block.split('\n').filter((l) => l.trim() !== '');
            if (!lines.length) return '';
            if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
                const ordered = /^\s*\d+[.)]\s+/.test(lines[0]);
                return '<' + (ordered ? 'ol' : 'ul') + '>' + lines.map((l) => '<li>' + nbMathInline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, '')) + '</li>').join('') + '</' + (ordered ? 'ol' : 'ul') + '>';
            }
            return '<p>' + lines.map((l) => { const h = /^#{1,4}\s+(.*)$/.exec(l); return h ? '<b>' + nbMathInline(h[1]) + '</b>' : nbMathInline(l); }).join('<br>') + '</p>';
        }).join('');
    }
    const nbAssistRich = nbMathRich;
    const nbAssistM = (t) => nbMathInline(t);
    // Copying from or pasting into a Notes box keeps maths as maths: the clipboard carries the drawn form (marked as ours) and a readable
    // plain-text form, and a paste is only ever rebuilt from the few tags and classes the editor itself uses.
    const NB_PASTE_TAGS = /^(DIV|SPAN|I|B|STRONG|EM|SUP|SUB|BR|P|UL|OL|LI|H1|H2|TABLE|TBODY|TR|TD|CODE)$/;
    function nbSanitizeMathHtml(html) {
        const box = document.createElement('div'); box.innerHTML = String(html || '');
        const marked = box.querySelector('[data-lm-maths]'); if (marked) box.innerHTML = marked.innerHTML;   // the wrapper is ours: only its contents are pasted
        box.querySelectorAll('script, style, iframe, object, embed, link, meta, img').forEach((n) => n.remove());
        const clean = (node) => {
            Array.from(node.childNodes).forEach((c) => {
                if (c.nodeType === 8) { c.remove(); return; }
                if (c.nodeType !== 1) return;
                clean(c);
                if (!NB_PASTE_TAGS.test(c.tagName)) { while (c.firstChild) c.parentNode.insertBefore(c.firstChild, c); c.remove(); return; }
                Array.from(c.attributes).forEach((a) => { if (a.name !== 'class' && !(a.name === 'data-cols' || a.name === 'data-rows')) c.removeAttribute(a.name); });
                if (c.getAttribute('class')) c.setAttribute('class', c.getAttribute('class').split(/\s+/).filter((k) => /^(math-|frac|root|int-|mx|func-|nb-dash|nb-arrow)/.test(k)).join(' '));
                if (!c.getAttribute('class')) c.removeAttribute('class');
            });
        };
        clean(box);
        return box.innerHTML;
    }
    const NB_MATHS_SELECTOR = '.math-symbol, .frac, .root, sup, sub, .mx, .math-bracket, .math-function-argument, .int-limits, .func-primes';
    function nbMathCopy(ev, cut, host) {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount || sel.isCollapsed || !ev.clipboardData) return false;
        const range = sel.getRangeAt(0);
        if (host && !host.contains(range.commonAncestorContainer)) return false;
        const box = document.createElement('div'); box.appendChild(range.cloneContents());
        if (!box.querySelector(NB_MATHS_SELECTOR)) return false;
        ev.preventDefault();
        ev.clipboardData.setData('text/html', '<div data-lm-maths="1">' + box.innerHTML + '</div>');
        ev.clipboardData.setData('text/plain', nbPlainText(box.innerHTML));
        if (cut) { document.execCommand('delete'); if (host) host.dispatchEvent(new Event('input', { bubbles: true })); }
        return true;
    }
    // Text that looks like maths (LaTeX, or the written-out shorthand) becomes drawn maths when pasted into a box.
    function nbLooksLikeMaths(t) { return /\$[^$\n]+\$|\\\(|\\\[|\\(frac|sqrt|times|cdot|alpha|beta|theta|pi|leq|geq)\b|\^\(|\^\{|_\(|sqrt\(|√\(|\([^()\n]+\)\/\([^()\n]+\)/.test(t); }
    // The page as plain text: block order down the page, with fractions, powers and roots written out.
    function nbPlainText(html) {
        const box = document.createElement('div'); box.innerHTML = html || '';
        const walk = (n) => {
            if (n.nodeType === 3) return n.textContent.replace(/\u200b/g, '');
            if (n.nodeType !== 1) return '';
            const cl = n.classList, kids = () => Array.from(n.childNodes).map(walk).join('');
            if (cl && cl.contains('frac')) { const a = n.querySelector('.frac-num'), b = n.querySelector('.frac-den'); const x = a ? walk(a) : '', y = b ? walk(b) : ''; return x || y ? '(' + x + ')/(' + y + ')' : ''; }
            if (cl && cl.contains('int-limits')) { const u = n.querySelector('.int-upper'), l = n.querySelector('.int-lower'); return '[' + (l ? walk(l) : '') + ', ' + (u ? walk(u) : '') + ']'; }
            if (cl && cl.contains('math-bar')) { const i = kids(); return i.length === 1 ? i + '\u0304' : i ? 'bar(' + i + ')' : ''; }
            if (n.tagName === 'SUP') { const i = kids(); return i ? '^(' + i + ')' : ''; }
            if (n.tagName === 'SUB') { const i = kids(); return i ? '_(' + i + ')' : ''; }
            if (cl && cl.contains('root-n')) { const r = n.querySelector('.root-index'); const i = r ? walk(r) : ''; return (i ? '^(' + i + ')' : '') + '\u221a'; }
            if (n.tagName === 'BR') return '\n';
            if (n.tagName === 'LI') return '- ' + kids() + '\n';
            if (n.tagName === 'SPAN' && cl && cl.contains('nb-arrow-step')) return '\n  -> ' + kids();
            const inner = kids();
            return /^(DIV|P|H1|H2|H3|UL|OL)$/.test(n.tagName) ? inner + '\n' : inner;
        };
        return walk(box).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    }
    window.LMMath = { createEditor: createSmartAnswerEditor, rich: nbMathRich, inline: nbMathInline, looksLikeMaths: nbLooksLikeMaths, sanitize: sanitizeEditorHtml, plainText: nbPlainText };
})();
