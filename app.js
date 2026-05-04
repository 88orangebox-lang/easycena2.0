// Registrácia offline režimu a inštalácie
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js');
}
let katalog = JSON.parse(localStorage.getItem('easycena_katalog')) || [];
let archiv = JSON.parse(localStorage.getItem('easycena_archiv')) || [];

document.addEventListener('DOMContentLoaded', () => {
    nacitajProfil();
    vykresliKatalog();
    vykresliArchiv();
    obnovRozpracovanuPonuku();
    
    if (document.querySelectorAll('.polozka-riadok').length === 0) {
        pridajRiadok(); 
    }
    prepocitajSumy();
});

// ==========================================
// ROBUSTNÝ AUTOSAVE A ČÍSLOVANIE
// ==========================================
function ulozRozpracovanuPonuku() {
    const polozky = [];
    Array.from(document.getElementById('zoznam-poloziek').children).forEach(dieta => {
        if (dieta.classList.contains('balik-kontajner')) {
            const polozkyBalika = [];
            dieta.querySelectorAll('.polozka-riadok').forEach(r => {
                polozkyBalika.push({
                    kategoria: r.dataset.kategoria || 'material',
                    mj: r.dataset.mj || 'ks',
                    dph: r.dataset.dph || '23', // NOVÝ RIADOK
                    zakladneMnozstvo: r.dataset.zakladneMnozstvo || 0,
                    nazov: r.querySelector('.polozka-nazov').value,
                    cena: r.querySelector('.polozka-cena').value,
                    mnozstvo: r.querySelector('.polozka-mnozstvo').value,
                    popis: r.querySelector('.polozka-popis') ? r.querySelector('.polozka-popis').value : '',
                    upozornenie: r.dataset.upozornenie || '',
                    zamknutaCena: r.dataset.zamknutaCena || '' // NOVÉ: pamätá si zámok
                });
            });
            polozky.push({
                typRiadku: 'balik',
                nazovBalika: dieta.dataset.nazovBalika,
                nasobic: dieta.querySelector('.balik-nasobic').value,
                polozky: polozkyBalika
            });
        } else if (dieta.classList.contains('polozka-riadok')) {
            polozky.push({
                typRiadku: 'polozka',
                kategoria: dieta.dataset.kategoria || 'material',
                mj: dieta.dataset.mj || 'ks',
                dph: dieta.dataset.dph || '23', // NOVÝ RIADOK
                nazov: dieta.querySelector('.polozka-nazov').value,
                cena: dieta.querySelector('.polozka-cena').value,
                mnozstvo: dieta.querySelector('.polozka-mnozstvo').value,
                popis: dieta.querySelector('.polozka-popis') ? dieta.querySelector('.polozka-popis').value : '',
                upozornenie: dieta.dataset.upozornenie || '',
                zamknutaCena: dieta.dataset.zamknutaCena || '' // NOVÉ: pamätá si zámok
            });
        }
    });

    const zlavy = [];
    document.querySelectorAll('.zlava-riadok').forEach(r => {
        zlavy.push({
            typ: r.querySelector('.zlava-typ').value,
            hodnota: r.querySelector('.zlava-hodnota').value
        });
    });

    const data = {
        rezimSupisPrac: window.jeRezimSupis || false, // NOVÉ: pamätá si režim súpisu
        cislo: document.getElementById('cislo-ponuky').value,
        meno: document.getElementById('meno-zakaznika').value,
        ulica: document.getElementById('ulica-zakaznika').value,
        mesto: document.getElementById('mesto-zakaznika').value,
        ico: document.getElementById('ico-zakaznika').value,
        dic: document.getElementById('dic-zakaznika').value,
        icdph: document.getElementById('icdph-zakaznika').value,
        telefon: document.getElementById('telefon-zakaznika').value,
        email: document.getElementById('email-zakaznika').value,
        znackaId: document.getElementById('ponuka-znacka') ? document.getElementById('ponuka-znacka').value : '',
        platnostDo: document.getElementById('platnost-do') ? document.getElementById('platnost-do').value : '',
        miestoVystavenia: document.getElementById('ponuka-miesto-vystavenia') ? document.getElementById('ponuka-miesto-vystavenia').value : '',
        datumVystavenia: document.getElementById('ponuka-datum-vystavenia') ? document.getElementById('ponuka-datum-vystavenia').value : '',
        poznamka1: document.getElementById('ponuka-poznamka-1') ? document.getElementById('ponuka-poznamka-1').value : '',
        informacia2: document.getElementById('ponuka-informacia-2') ? document.getElementById('ponuka-informacia-2').value : '',
        dodacie: document.getElementById('ponuka-dodacie') ? document.getElementById('ponuka-dodacie').value : 'dohodou',
        platobne: document.getElementById('ponuka-platobne') ? document.getElementById('ponuka-platobne').value : 'zálohová platba',
        zarukaZariadenie: document.getElementById('ponuka-zaruka-zariadenie') ? document.getElementById('ponuka-zaruka-zariadenie').value : '36 mesiacov na dodané zariadenia',
        zarukaMontaz: document.getElementById('ponuka-zaruka-montaz') ? document.getElementById('ponuka-zaruka-montaz').value : '36 mesiacov na montáž',
        polozky: polozky,
        zlavy: zlavy
    };



    localStorage.setItem('easycena_rozpracovana', JSON.stringify(data));
    markSaved();
}

// =====================================================
// AUTOSAVE INDIKÁTOR ("💾 Uložené" / "💾 Pred 5s")
// =====================================================
let _lastSavedAt = Date.now();
let _flashTimer = null;

function markSaved() {
    _lastSavedAt = Date.now();
    aktualizujAutosaveStatus(true);
}

function aktualizujAutosaveStatus(flash = false) {
    const el = document.getElementById('autosave-status');
    if (!el) return;
    const diff = Math.round((Date.now() - _lastSavedAt) / 1000);
    let text;
    if (diff < 5) text = '💾 Uložené';
    else if (diff < 60) text = `💾 Pred ${diff}s`;
    else if (diff < 3600) text = `💾 Pred ${Math.round(diff / 60)}m`;
    else text = `💾 Pred ${Math.round(diff / 3600)}h`;
    el.textContent = text;

    if (flash) {
        el.classList.add('flash');
        clearTimeout(_flashTimer);
        _flashTimer = setTimeout(() => el.classList.remove('flash'), 600);
    }
}
// Tikni text raz za 10 sekúnd, aby sa "Pred 30s" → "Pred 40s" sám aktualizoval
setInterval(() => aktualizujAutosaveStatus(false), 10000);

// =====================================================
// QUICK TOGGLE TÉMY (☀️ / 🌙) v hero rohu
// =====================================================
function aktualizujThemeIkonu() {
    const btn = document.getElementById('theme-quick-toggle');
    if (!btn) return;
    const isLight = document.body.getAttribute('data-theme') === 'light';
    btn.textContent = isLight ? '☀️' : '🌙';
    btn.title = isLight ? 'Prepnúť na tmavý režim' : 'Prepnúť na svetlý režim';
}

(function initThemeQuickToggle() {
    const btn = document.getElementById('theme-quick-toggle');
    if (!btn) return;

    // Počiatočná ikona podľa aktuálneho stavu
    aktualizujThemeIkonu();

    btn.addEventListener('click', () => {
        const isLight = document.body.getAttribute('data-theme') === 'light';
        const newIsLight = !isLight;

        // Synchronizujeme aj s checkboxom v Nastaveniach
        const settingsToggle = document.getElementById('theme-toggle');
        if (settingsToggle) {
            settingsToggle.checked = newIsLight;
            settingsToggle.dispatchEvent(new Event('change'));
        } else {
            // Fallback ak by tam toggle nebol
            if (newIsLight) {
                document.body.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
            } else {
                document.body.removeAttribute('data-theme');
                localStorage.removeItem('theme');
            }
        }
        aktualizujThemeIkonu();
    });
})();

function obnovRozpracovanuPonuku() {
    const data = JSON.parse(localStorage.getItem('easycena_rozpracovana'));
    if (data) {
        window.jeRezimSupis = data.rezimSupisPrac || false;

        // --- BANNER PRE SÚPIS PRÁC ---
        let banner = document.getElementById('supis-banner');
        if (window.jeRezimSupis) {
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'supis-banner';
                banner.style.backgroundColor = 'var(--danger-btn-bg-color)';
                banner.style.color = '#fff';
                banner.style.padding = '12px';
                banner.style.textAlign = 'center';
                banner.style.fontWeight = 'bold';
                banner.style.borderRadius = '6px';
                banner.style.marginBottom = '20px';
                banner.style.textTransform = 'uppercase';
                const tabPonuka = document.getElementById('tab-ponuka');
                tabPonuka.insertBefore(banner, tabPonuka.firstChild);
            }
            banner.innerText = '⚠️ REŽIM: SÚPIS PRÁC K PONUKE Č. ' + (data.cislo || 'Neznáme');
            banner.style.display = 'block';
        } else if (banner) {
            banner.style.display = 'none';
        }
        // ------------------------------
        
        // --- UPRATOVANIE PLOCHY PRE SÚPIS ---
        const prvkyNaSchovanie = ['obal-logo-znacky', 'obal-platnost', 'obal-podmienky', 'obal-informacia-2'];
        prvkyNaSchovanie.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = window.jeRezimSupis ? 'none' : 'block';
        });
        // ------------------------------------

        document.getElementById('cislo-ponuky').value = data.cislo || '';
        document.getElementById('meno-zakaznika').value = data.meno || '';
        document.getElementById('ulica-zakaznika').value = data.ulica || '';
        document.getElementById('mesto-zakaznika').value = data.mesto || '';
        document.getElementById('ico-zakaznika').value = data.ico || '';
        document.getElementById('dic-zakaznika').value = data.dic || '';
        document.getElementById('icdph-zakaznika').value = data.icdph || '';
        document.getElementById('telefon-zakaznika').value = data.telefon || '';
        document.getElementById('email-zakaznika').value = data.email || '';
    if(document.getElementById('ponuka-znacka')) document.getElementById('ponuka-znacka').value = data.znackaId || '';
    if(document.getElementById('ponuka-dodacie')) document.getElementById('ponuka-dodacie').value = data.dodacie || 'dohodou';
    if(document.getElementById('ponuka-platobne')) document.getElementById('ponuka-platobne').value = data.platobne || 'zálohová platba';
    if(document.getElementById('ponuka-zaruka-zariadenie')) document.getElementById('ponuka-zaruka-zariadenie').value = data.zarukaZariadenie || '36 mesiacov na dodané zariadenia';
    if(document.getElementById('ponuka-zaruka-montaz')) document.getElementById('ponuka-zaruka-montaz').value = data.zarukaMontaz || '36 mesiacov na montáž';
    if(document.getElementById('platnost-do')) document.getElementById('platnost-do').value = data.platnostDo || '';
    const profil = JSON.parse(localStorage.getItem('easycena_profil')) || {};
        
    if(document.getElementById('ponuka-miesto-vystavenia')) {
        document.getElementById('ponuka-miesto-vystavenia').value = data.miestoVystavenia !== undefined ? data.miestoVystavenia : (profil.miestoVystavenia || '');
    }
    if(document.getElementById('ponuka-datum-vystavenia')) {
        document.getElementById('ponuka-datum-vystavenia').value = data.datumVystavenia || new Date().toISOString().split('T')[0];
    }

    if(document.getElementById('ponuka-poznamka-1')) {
        document.getElementById('ponuka-poznamka-1').value = data.poznamka1 !== undefined ? data.poznamka1 : (profil.poznamka1 || '');
    }
    if(document.getElementById('ponuka-informacia-2')) {
        document.getElementById('ponuka-informacia-2').value = data.informacia2 !== undefined ? data.informacia2 : (profil.informacia2 || '');
    }

        document.getElementById('zoznam-poloziek').innerHTML = '';
        document.getElementById('zoznam-zliav').innerHTML = '';

        if (data.polozky && Array.isArray(data.polozky)) {
            data.polozky.forEach(p => {
                if (p.typRiadku === 'balik') {
                    pridajBalikNaPlochu(p.nazovBalika, p.polozky, p.nasobic);
                } else {
                    pridajRiadok(p.kategoria, p.nazov, p.mnozstvo, p.mj, p.cena, p.dph, p.popis || '', p.upozornenie || ''); 
                    if (p.zamknutaCena === 'ano') {
                        document.getElementById('zoznam-poloziek').lastElementChild.dataset.zamknutaCena = 'ano';
                    }
                }
            });
            if (data.zlavy && Array.isArray(data.zlavy)) {
                data.zlavy.forEach(z => pridajZlavu(z.typ, z.hodnota, z.zamknuta || ''));
            }
        } else if (data.polozkyHTML !== undefined) {
            document.getElementById('zoznam-poloziek').innerHTML = data.polozkyHTML;
            document.getElementById('zoznam-zliav').innerHTML = data.zlavyHTML || '';
            document.querySelectorAll('.polozka-riadok, .zlava-riadok').forEach(pripojUdalostiRiadku);
            ulozRozpracovanuPonuku();
        }
    } else {
        generujNoveCislo();
    }
    aktualizujNadpisPonuky();
}

// Dynamický titulok hero headera v Ponuke:
// - Ak je vyplnené meno klienta → "Úprava ponuky 🖊️"
// - Ak je prázdne → "Nová ponuka 📝"
function aktualizujNadpisPonuky() {
    const titulok = document.getElementById('ponuka-titulok');
    if (!titulok) return;
    const meno = (document.getElementById('meno-zakaznika')?.value || '').trim();
    if (meno) {
        titulok.innerHTML = 'Úprava ponuky <span class="hero-emoji">🖊️</span>';
    } else {
        titulok.innerHTML = 'Nová ponuka <span class="hero-emoji">📝</span>';
    }
}

function generujNoveCislo() {
    let profil = JSON.parse(localStorage.getItem('easycena_profil')) || {};
    let sablona = profil.sablonaCisla || 'CP-{ROK}-{CISLO}';

    let aktualnyRok = new Date().getFullYear();
    let pocitadlo = JSON.parse(localStorage.getItem('pocitadloPonuk')) || { rok: aktualnyRok, pocet: 0 };

    if (pocitadlo.rok !== aktualnyRok) {
        pocitadlo.rok = aktualnyRok;
        pocitadlo.pocet = 0;
    }

    // 1. Zistíme najvyššie poradové číslo v Archíve (vylepšená detekcia)
    let maxVArchive = 0;
    archiv.forEach(ponuka => {
        if (ponuka.cislo) {
            // Najprv vymažeme zo stringu aktuálny rok, aby sa nám neplietol s poradovým číslom
            let cisloBezRoka = ponuka.cislo.replace(aktualnyRok.toString(), '');
            // Až teraz vytiahneme zostávajúce číslice
            let cislaVPonuke = cisloBezRoka.match(/\d+/g);
            if (cislaVPonuke) {
                cislaVPonuke.forEach(cisloStr => {
                    let cislo = parseInt(cisloStr, 10);
                    if (cislo > maxVArchive) {
                        maxVArchive = cislo;
                    }
                });
            }
        }
    });

    // 2. Vyberieme väčšie z dvoch: to čo je v Nastaveniach, alebo to z Archívu
    let nasledujuceCislo = Math.max(pocitadlo.pocet, maxVArchive) + 1;

    // 3. Poistka: Uložíme nový stav priamo do pamäte, aby sa číselník nezasekával
    pocitadlo.pocet = nasledujuceCislo - 1; 
    localStorage.setItem('pocitadloPonuk', JSON.stringify(pocitadlo));

    // 4. Vytvoríme finálny text a vložíme ho do políčka
    let naformatovaneCislo = nasledujuceCislo.toString().padStart(3, '0');
    let vysledneCislo = sablona.replace('{ROK}', aktualnyRok).replace('{CISLO}', naformatovaneCislo);
    document.getElementById('cislo-ponuky').value = vysledneCislo;

    // 5. Aktualizujeme aj číslo v Nastaveniach
    const polickoVNastaveniach = document.getElementById('profil-pocitadlo');
    if (polickoVNastaveniach) {
        polickoVNastaveniach.value = nasledujuceCislo;
    }
}

document.getElementById('tab-ponuka').addEventListener('input', ulozRozpracovanuPonuku);

// ==========================================
// PRACOVNÁ PLOCHA
// ==========================================
document.getElementById('pridat-polozku-btn').addEventListener('click', () => {
    pridajRiadok();
    ulozRozpracovanuPonuku();
});

function pridajRiadok(kategoria = 'material', nazov = '', mnozstvo = 1, mj = 'ks', cena = '', dph = null, popis = '', upozornenie = '') {
    if (dph === null) {
        const profil = JSON.parse(localStorage.getItem('easycena_profil')) || {};
        dph = profil.sadzbaDph || '23';
    }
    const div = document.createElement('div');
    div.className = 'polozka-riadok flex-row';
    div.style.flexWrap = 'wrap'; // Dôležité: donúti textové pole skočiť na nový riadok
    div.dataset.kategoria = kategoria;
    div.dataset.mj = mj;
    div.dataset.dph = dph;
    div.dataset.upozornenie = upozornenie; 
    
    div.innerHTML = `
        <input type="text" class="polozka-nazov" placeholder="Názov položky (Balíčka)" value="${nazov}" style="flex: 2.5;">
        <div style="position: relative; flex: 1; display: flex;">
            ${upozornenie ? `<div title="Cena sa oproti pôvodnej ponuke zmenila o ${upozornenie}" style="position: absolute; left: 5px; top: 50%; transform: translateY(-50%); background: var(--accent-color); color: #000; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; cursor: help; z-index: 2; box-shadow: 0 0 5px rgba(0,0,0,0.3);">i</div>` : ''}
            <input type="number" class="polozka-cena" value="${cena}" min="0" step="0.01" style="width: 100%; padding-left: ${upozornenie ? '25px' : '8px'}; background-color: var(--card-bg-color); cursor: pointer; color: var(--text-muted-color); border: 1px solid var(--input-border-color); padding-right: 22px; box-sizing: border-box;" placeholder="€/MJ" readonly title="Klikni pre manuálnu úpravu ceny">
            <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: var(--text-muted-color); font-weight: bold; pointer-events: none;">€</span>
        </div>
        <div style="display: flex; flex: 1.5; min-width: 120px;">
            <button type="button" class="mnoz-minus" style="padding: 0 10px; border-radius: 6px 0 0 6px; border: 2px solid var(--text-muted-color); border-right: none; margin: 0; font-weight: bold; font-size: 18px; background: var(--secondary-btn-bg-color); color: var(--text-color); cursor: pointer;">-</button>
            <input type="number" class="polozka-mnozstvo" value="${mnozstvo}" min="1" style="width: 100%; text-align: center; border-radius: 0; margin: 0; padding: 10px 0; border-left: none; border-right: none;" placeholder="Počet">
            <button type="button" class="mnoz-plus" style="padding: 0 10px; border-radius: 0 6px 6px 0; border: 2px solid var(--text-muted-color); border-left: none; margin: 0; font-weight: bold; font-size: 18px; background: var(--secondary-btn-bg-color); color: var(--text-color); cursor: pointer;">+</button>
        </div>
        <button type="button" class="btn-danger btn-small zmazat-riadok-btn" style="flex: 0.5; margin-left: 5px;">X</button>
        
        <textarea class="polozka-popis" rows="2" placeholder="Technický popis (zobrazí sa v PDF pod cenovou tabuľkou)" style="width: 100%; margin-top: 8px; padding: 6px; font-size: 13px; background-color: var(--input-bg-color); color: var(--text-muted-color); border: 1px dashed var(--border-color); border-radius: 4px; display: ${(kategoria === 'zariadenie' && popis.trim() !== '') ? 'block' : 'none'}; resize: vertical;">${popis}</textarea>
    `;
    document.getElementById('zoznam-poloziek').appendChild(div);
    pripojUdalostiRiadku(div);
}
function pridajBalikNaPlochu(balikNazov, polozkyBalika, ulozenyNasobic = 1) {
    const kontajner = document.createElement('div');
    kontajner.className = 'balik-kontajner';
    kontajner.dataset.nazovBalika = balikNazov;

    // Hlavička balíka
    kontajner.innerHTML = `
        <div class="balik-kontajner-header">
            <strong style="font-size: 16px; text-transform: uppercase;">📦 ${balikNazov}</strong>
            <div style="display: flex; align-items: center; gap: 15px;">
                <span class="balik-label-text">Celkom:</span>
                <div style="display: flex; width: 110px;">
                    <button type="button" class="balik-minus balik-btn">-</button>
                    <input type="text" class="balik-nasobic" value="${ulozenyNasobic}" readonly>
                    <button type="button" class="balik-plus balik-btn">+</button>
                </div>
                <button type="button" class="btn-danger btn-small zmazat-balik-btn">X</button>
            </div>
        </div>
        <div class="balik-polozky-obal"></div>
    `;

    document.getElementById('zoznam-poloziek').appendChild(kontajner);
    const obal = kontajner.querySelector('.balik-polozky-obal');

    // Vloženie položiek balíka
    polozkyBalika.forEach(p => {
        const div = document.createElement('div');
        div.className = 'polozka-riadok flex-row v-baliku';
        div.style.flexWrap = 'wrap'; // DÔLEŽITÉ: Aby textové pole skočilo na nový riadok
        div.dataset.kategoria = p.kategoria;
        div.dataset.mj = p.mj;
        div.dataset.dph = p.dph || '23';
        // Pamatáme si základnú normu pre Pravidlo C
        div.dataset.zakladneMnozstvo = p.zakladneMnozstvo || p.mnozstvo;

        let upozornenie = p.upozornenie || '';
        div.dataset.upozornenie = upozornenie;
        if (p.zamknutaCena === 'ano') div.dataset.zamknutaCena = 'ano';         
        
        // NOVÉ: Vytiahneme popis priamo z katalógu, ak ho balíček v sebe nemá uložený
        let textPopisu = p.popis || '';
        if (!textPopisu && p.kategoria === 'zariadenie') {
            const najdene = katalog.find(katP => katP.typ === 'polozka' && katP.nazov.trim().toLowerCase() === p.nazov.trim().toLowerCase());
            if (najdene && najdene.popis) {
                textPopisu = najdene.popis;
            }
        }

        div.innerHTML = `
            <input type="text" class="polozka-nazov" value="${p.nazov}" style="flex: 2.5;">
            <div style="position: relative; flex: 1; display: flex;">
                ${upozornenie ? `<div title="Cena sa oproti pôvodnej ponuke zmenila o ${upozornenie}" style="position: absolute; left: 5px; top: 50%; transform: translateY(-50%); background: var(--accent-color); color: #000; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; cursor: help; z-index: 2; box-shadow: 0 0 5px rgba(0,0,0,0.3);">i</div>` : ''}
                <input type="number" class="polozka-cena" value="${p.cena}" min="0" step="0.01" style="width: 100%; padding-left: ${upozornenie ? '25px' : '8px'}; padding-right: 22px; box-sizing: border-box;" readonly title="Klikni pre manuálnu úpravu">
                <span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: var(--text-muted-color); font-weight: bold; pointer-events: none;">€</span>
            </div>
            <div style="display: flex; flex: 1.5; min-width: 120px;">
                <button type="button" class="mnoz-minus" style="padding: 0 10px; margin: 0;">-</button>
                <input type="number" class="polozka-mnozstvo" value="${p.mnozstvo}" min="0" step="0.01" style="width: 100%; text-align: center; border-radius: 0; margin: 0; padding: 10px 0;" placeholder="Počet">
                <button type="button" class="mnoz-plus" style="padding: 0 10px; margin: 0;">+</button>
            </div>
            <button type="button" class="btn-danger btn-small zmazat-riadok-btn" style="flex: 0.5; margin-left: 5px;">X</button>
            
            <textarea class="polozka-popis" rows="2" placeholder="Technický popis (zobrazí sa v PDF pod cenovou tabuľkou)" style="width: 100%; margin-top: 8px; padding: 6px; font-size: 13px; background-color: var(--input-bg-color); color: var(--text-muted-color); border: 1px dashed var(--border-color); border-radius: 4px; display: ${(p.kategoria === 'zariadenie' && textPopisu.trim() !== '') ? 'block' : 'none'}; resize: vertical;">${textPopisu}</textarea>
        `;
        obal.appendChild(div);
        pripojUdalostiRiadku(div); // Aj vnútri balíka fungujú manuálne úpravy!
    });

    // Pravidlo C: Logika Dávkovacieho pripočítavania
    kontajner.querySelector('.zmazat-balik-btn').addEventListener('click', () => {
        kontajner.remove();
        prepocitajSumy();
        ulozRozpracovanuPonuku();
    });

    const inputNasobic = kontajner.querySelector('.balik-nasobic');
    kontajner.querySelector('.balik-plus').addEventListener('click', () => {
        inputNasobic.value = parseInt(inputNasobic.value) + 1;
        kontajner.querySelectorAll('.polozka-riadok').forEach(riadok => {
            const inputMnozstvo = riadok.querySelector('.polozka-mnozstvo');
            const zaklad = parseFloat(riadok.dataset.zakladneMnozstvo) || 0;
            const aktualne = parseFloat(inputMnozstvo.value) || 0;
            // Prihodí normu k aktuálnemu stavu (zachováva manuálne rezervy)
            inputMnozstvo.value = Number((aktualne + zaklad).toFixed(2)); 
        });
        prepocitajSumy();
        ulozRozpracovanuPonuku();
    });

    kontajner.querySelector('.balik-minus').addEventListener('click', () => {
        const nasobic = parseInt(inputNasobic.value);
        if (nasobic > 1) {
            inputNasobic.value = nasobic - 1;
            kontajner.querySelectorAll('.polozka-riadok').forEach(riadok => {
                const inputMnozstvo = riadok.querySelector('.polozka-mnozstvo');
                const zaklad = parseFloat(riadok.dataset.zakladneMnozstvo) || 0;
                const aktualne = parseFloat(inputMnozstvo.value) || 0;
                let nove = aktualne - zaklad;
                if (nove < 0) nove = 0; // Brzda, aby sme nešli do mínusu
                inputMnozstvo.value = Number(nove.toFixed(2));
            });
            prepocitajSumy();
            ulozRozpracovanuPonuku();
        }
    });
}
document.getElementById('pridat-zlavu-btn').addEventListener('click', () => {
    pridajZlavu();
    ulozRozpracovanuPonuku();
});

function pridajZlavu(typ = 'globalna', hodnota = 0, zamknuta = '') {
    const div = document.createElement('div');
    div.className = 'zlava-riadok flex-row';
    div.dataset.zamknuta = zamknuta;

    div.innerHTML = `
        <select class="zlava-typ" style="flex: 2;" ${zamknuta === 'ano' ? 'disabled' : ''}>
            <option value="zariadenie" ${typ==='zariadenie'?'selected':''}>🔵 Na zariadenia</option>
            <option value="material" ${typ==='material'?'selected':''}>🟡 Na materiál</option>
            <option value="praca" ${typ==='praca'?'selected':''}>🟢 Na prácu</option>
            <option value="globalna" ${typ==='globalna'?'selected':''}>⚪ Na celú ponuku</option>
        </select>
        <input type="number" class="zlava-hodnota" value="${hodnota}" min="0" max="100" style="flex: 1;" placeholder="%" ${zamknuta === 'ano' ? 'readonly' : ''} ${zamknuta === 'ano' ? 'title="Klikni pre manuálnu úpravu"' : ''}>
        <button type="button" class="btn-danger btn-small zmazat-riadok-btn" style="flex: 0.5;">X</button>
    `;
    document.getElementById('zoznam-zliav').appendChild(div);
    
    // Ochrana zmazania starej zľavy v súpise
    const zmazBtn = div.querySelector('.zmazat-riadok-btn');
    zmazBtn.addEventListener('click', (e) => {
        if (window.jeRezimSupis && div.dataset.zamknuta === 'ano') {
            alert('Pôvodne dohodnuté zľavy z cenovej ponuky nie je možné v súpise prác vymazať.');
            e.stopImmediatePropagation();
            return;
        }
    });

    // Ochrana prepísania hodnoty zľavy (odomknutie na klik)
    const hodnotaInput = div.querySelector('.zlava-hodnota');
    if (zamknuta === 'ano') {
        hodnotaInput.style.backgroundColor = 'var(--card-bg-color)';
        hodnotaInput.style.color = 'var(--text-muted-color)';
    }
    
    hodnotaInput.addEventListener('click', () => {
        if (window.jeRezimSupis && div.dataset.zamknuta === 'ano' && hodnotaInput.readOnly) {
            if (confirm('Chceš naozaj zmeniť túto pôvodne dohodnutú zľavu?')) {
                hodnotaInput.readOnly = false;
                hodnotaInput.style.backgroundColor = 'var(--input-bg-color)';
                hodnotaInput.style.color = 'var(--text-color)';
                hodnotaInput.focus();
            }
        }
    });

    pripojUdalostiRiadku(div);
}

function pripojUdalostiRiadku(div) {
    // Reakcia na manuálne prepísanie
    div.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('input', prepocitajSumy);
    });
    
    // Zmazanie riadku
    div.querySelector('.zmazat-riadok-btn').addEventListener('click', () => {
        div.remove();
        prepocitajSumy();
        ulozRozpracovanuPonuku();
    });

    // --- OCHRANA CENY (ZAMKNUTIE / ODOMKNUTIE) ---
    const cenaInput = div.querySelector('.polozka-cena');
    if (cenaInput) {
        // Použijeme priamo DOM vlastnosť miesto HTML atribútu
        cenaInput.readOnly = true;
        cenaInput.classList.add('polozka-cena-readonly');
        let casOdomknutia = 0;
        
        cenaInput.addEventListener('click', () => {
            if (cenaInput.readOnly) {
                // --- OCHRANA PRE SÚPIS PRÁC ---
                if (window.jeRezimSupis && div.dataset.zamknutaCena === 'ano') {
                    alert('V režime "Súpis prác" sú ceny z pôvodnej ponuky prísne uzamknuté.\n\nPre viacpráce pridajte na plochu úplne novú položku z Katalógu.');
                    return;
                }
                // ------------------------------
                if (confirm('Chceš manuálne upraviť jednotkovú cenu tejto položky?')) {
                    // Oddelíme odomknutie od samotného kliku, aby prehliadač neblokoval klávesnicu
                    setTimeout(() => {
                        cenaInput.readOnly = false;
                        cenaInput.classList.remove('polozka-cena-readonly');
                        cenaInput.classList.add('polozka-cena-editable');
                        cenaInput.focus();
                        cenaInput.select();
                        casOdomknutia = Date.now();
                    }, 50);
                }
            }
        });
        
        cenaInput.addEventListener('blur', () => {
            // Ak ubehlo menej ako 200ms od odomknutia, ignorujeme tento blur 
            // (ochrana proti falošnému poplachu z prehliadača po zatvorení okna)
            if (Date.now() - casOdomknutia < 200) {
                cenaInput.focus(); 
                return;
            }
            cenaInput.readOnly = true;
            cenaInput.classList.remove('polozka-cena-editable');
            cenaInput.classList.add('polozka-cena-readonly');
        });
    }
    // ---------------------------------------------
    
    // --- LOGIKA PRE TLAČIDLÁ + a - ---
    const mnozInput = div.querySelector('.polozka-mnozstvo');
    const minusBtn = div.querySelector('.mnoz-minus');
    const plusBtn = div.querySelector('.mnoz-plus');

    if (mnozInput && minusBtn && plusBtn) {
        minusBtn.addEventListener('click', () => {
            let aktualne = parseFloat(mnozInput.value) || 0;
            if (aktualne > 1) { // Nedovolíme ísť do nuly alebo mínusu
                mnozInput.value = aktualne - 1;
                prepocitajSumy();
                ulozRozpracovanuPonuku();
            }
        });

        plusBtn.addEventListener('click', () => {
            let aktualne = parseFloat(mnozInput.value) || 0;
            mnozInput.value = aktualne + 1;
            prepocitajSumy();
            ulozRozpracovanuPonuku();
        });
    }
    // --------------------------------------
    
    // Našepkávač
    const nazovInput = div.querySelector('.polozka-nazov');
    if (nazovInput) {
        nazovInput.addEventListener('focus', (e) => ukazNasepkavac(e.target, true));
        nazovInput.addEventListener('input', (e) => ukazNasepkavac(e.target, false));
        nazovInput.addEventListener('blur', () => setTimeout(schovajNasepkavac, 250));
    }
}

document.getElementById('nova-ponuka-btn').addEventListener('click', () => {
    if(confirm('Vymazať ponuku a začať novú?')) {
        window.jeRezimSupis = false;
        const banner = document.getElementById('supis-banner');
        if (banner) banner.style.display = 'none';
        document.querySelectorAll('#tab-ponuka input:not([type="checkbox"])').forEach(i => i.value = '');
        const profil = JSON.parse(localStorage.getItem('easycena_profil')) || {};
        if(document.getElementById('ponuka-poznamka-1')) document.getElementById('ponuka-poznamka-1').value = profil.poznamka1 || '';
        if(document.getElementById('ponuka-informacia-2')) document.getElementById('ponuka-informacia-2').value = profil.informacia2 || '';
        if(document.getElementById('ponuka-dodacie')) document.getElementById('ponuka-dodacie').value = 'dohodou';
        if(document.getElementById('ponuka-platobne')) document.getElementById('ponuka-platobne').value = 'zálohová platba';
        if(document.getElementById('ponuka-zaruka-zariadenie')) document.getElementById('ponuka-zaruka-zariadenie').value = '36 mesiacov na dodané zariadenia';
        if(document.getElementById('ponuka-zaruka-montaz')) document.getElementById('ponuka-zaruka-montaz').value = '36 mesiacov na montáž';
        if(document.getElementById('ponuka-miesto-vystavenia')) document.getElementById('ponuka-miesto-vystavenia').value = profil.miestoVystavenia || '';
        if(document.getElementById('ponuka-datum-vystavenia')) document.getElementById('ponuka-datum-vystavenia').value = new Date().toISOString().split('T')[0];
        if(document.getElementById('ponuka-znacka')) document.getElementById('ponuka-znacka').value = '';
        document.getElementById('zoznam-poloziek').innerHTML = '';
        document.getElementById('zoznam-zliav').innerHTML = '';
        pridajRiadok();
        generujNoveCislo();
        prepocitajSumy();
        ulozRozpracovanuPonuku();
        aktualizujNadpisPonuky();
    }
});

// Live update titulku pri písaní mena klienta
(function initPonukaTitulokListener() {
    const meno = document.getElementById('meno-zakaznika');
    if (meno) meno.addEventListener('input', aktualizujNadpisPonuky);
})();

// ==========================================
// UNIVERZÁLNY NAŠEPKÁVAČ 
// ==========================================
let nasepkavacDiv = document.getElementById('vlastny-nasepkavac');
if (!nasepkavacDiv) {
    nasepkavacDiv = document.createElement('div');
    nasepkavacDiv.id = 'vlastny-nasepkavac';
    document.body.appendChild(nasepkavacDiv);
}

function ukazNasepkavac(inputElement, vsetko = false) {
    const hodnota = inputElement.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    nasepkavacDiv.innerHTML = '';

    const jeVBaliku = inputElement.classList.contains('b-nazov');
    const zoradenyKatalog = [...katalog].sort((a, b) => a.nazov.localeCompare(b.nazov, 'sk'));
    const zhody = zoradenyKatalog.filter(p => {
        if (jeVBaliku && p.typ === 'balik') return false;
        if (p.vyzadujeKontrolu) return false; // NOVÝ RIADOK: Skryje chybné položky
        const nazovBezDiakritiky = p.nazov.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return vsetko || nazovBezDiakritiky.includes(hodnota);
    });

    // Pre klávesnicovú navigáciu si pamätáme, ktorý input je "aktívny"
    nasepkavacDiv._aktivnyInput = inputElement;

    if (zhody.length > 0) {
        zhody.forEach(polozka => {
            const div = document.createElement('div');
            div.className = 'nasepkavac-polozka';

            // Farebná bodka kategórie / balíčka
            const triedaBodky = polozka.typ === 'balik'
                ? 'k-balik'
                : (polozka.kategoria === 'zariadenie' ? 'k-zariadenie'
                    : polozka.kategoria === 'praca' ? 'k-praca'
                    : 'k-material');

            if (polozka.typ === 'balik' && !jeVBaliku) {
                const pocet = polozka.polozky ? polozka.polozky.length : 0;
                div.innerHTML = `<span class="nasepkavac-bodka ${triedaBodky}"></span><span class="np-text"><strong>📦 ${polozka.nazov}</strong> <small>(${pocet} položiek)</small></span>`;
            } else {
                div.innerHTML = `<span class="nasepkavac-bodka ${triedaBodky}"></span><span class="np-text">${polozka.nazov} - ${polozka.cena} € / ${polozka.mj || 'ks'}</span>`;
            }

            // Centrálny výber — dostupný pre klik aj pre Enter
            const vyberPolozku = () => {
                if (jeVBaliku) {
                    const riadok = inputElement.closest('.balik-polozka-riadok');
                    inputElement.value = polozka.nazov;
                    riadok.querySelector('.b-cena').value = polozka.cena;
                    riadok.querySelector('.b-kat').value = polozka.kategoria;
                    if(riadok.querySelector('.b-mj') && polozka.mj) {
                        riadok.querySelector('.b-mj').value = polozka.mj;
                    }
                } else {
                    const riadok = inputElement.closest('.polozka-riadok');
                    if (polozka.typ === 'balik' && polozka.polozky) {
                        pridajBalikNaPlochu(polozka.nazov, polozka.polozky);
                        riadok.remove(); // Zmaže ten prázdny riadok, z ktorého si vyhľadával
                    } else {
                        inputElement.value = polozka.nazov;
                        riadok.querySelector('.polozka-cena').value = polozka.cena;
                        riadok.dataset.kategoria = polozka.kategoria;
                        riadok.dataset.mj = polozka.mj || 'ks';
                        riadok.dataset.dph = polozka.dph || '23';

                        // Zobrazenie a naplnenie technického popisu z katalógu
                        const popisArea = riadok.querySelector('.polozka-popis');
                        if (popisArea) {
                            if (polozka.kategoria === 'zariadenie' && polozka.popis && polozka.popis.trim() !== '') {
                                popisArea.style.display = 'block';
                                popisArea.value = polozka.popis;
                            } else {
                                popisArea.style.display = 'none';
                                popisArea.value = '';
                            }
                        }
                    }
                    prepocitajSumy();
                    ulozRozpracovanuPonuku();
                }
                schovajNasepkavac();
            };

            div.onmousedown = (e) => {
                e.preventDefault();
                vyberPolozku();
            };
            // Reference pre klávesnicový Enter
            div._vyberPolozku = vyberPolozku;

            nasepkavacDiv.appendChild(div);
        });

        const rect = inputElement.getBoundingClientRect();
        nasepkavacDiv.style.left = rect.left + window.scrollX + 'px';
        nasepkavacDiv.style.top = rect.bottom + window.scrollY + 'px';
        nasepkavacDiv.style.width = rect.width + 'px';
        nasepkavacDiv.style.display = 'block';
    } else {
        schovajNasepkavac();
    }
}
function schovajNasepkavac() {
    nasepkavacDiv.style.display = 'none';
    nasepkavacDiv._aktivnyInput = null;
}

// ==========================================
// KLÁVESNICOVÁ NAVIGÁCIA V NAŠEPKÁVAČI
// ==========================================
document.addEventListener('keydown', (e) => {
    // Reagujeme len ak je našepkávač zobrazený
    if (!nasepkavacDiv || nasepkavacDiv.style.display !== 'block') return;
    // ... a len ak má focus jeho "aktívny" input (aby sme neblokovali inú klávesnicu)
    if (document.activeElement !== nasepkavacDiv._aktivnyInput) return;

    const polozky = Array.from(nasepkavacDiv.querySelectorAll('.nasepkavac-polozka'));
    if (polozky.length === 0) return;

    let idx = polozky.findIndex(p => p.classList.contains('zvyraznena'));

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        idx = (idx < 0) ? 0 : (idx + 1) % polozky.length;
        polozky.forEach((p, i) => p.classList.toggle('zvyraznena', i === idx));
        polozky[idx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        idx = (idx <= 0) ? polozky.length - 1 : idx - 1;
        polozky.forEach((p, i) => p.classList.toggle('zvyraznena', i === idx));
        polozky[idx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
        if (idx < 0) return; // nič neoznačené — nech funguje default Enter (submit)
        e.preventDefault();
        if (typeof polozky[idx]._vyberPolozku === 'function') {
            polozky[idx]._vyberPolozku();
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        schovajNasepkavac();
    }
});

// ==========================================
// MATEMATIKA
// ==========================================
function prepocitajSumy() {
    // 1. Zistíme zľavy
    let zlavyPerc = { zariadenie: 0, material: 0, praca: 0, globalna: 0 };
    document.querySelectorAll('.zlava-riadok').forEach(riadok => {
        const typ = riadok.querySelector('.zlava-typ').value;
        const hodnota = parseFloat(riadok.querySelector('.zlava-hodnota').value) || 0;
        if(typ && hodnota > 0) zlavyPerc[typ] += hodnota;
    });

    const platcaDPH = document.getElementById('som-platca-dph').checked;

    let sumyKat = {
        zariadenie: { hrube: 0, dphKat: 0, dphCelkom: 0 },
        material: { hrube: 0, dphKat: 0, dphCelkom: 0 },
        praca: { hrube: 0, dphKat: 0, dphCelkom: 0 }
    };

    let rekapitulaciaDPH = {}; // Nová pamäť pre rozpis sadzieb

    // 2. Nový výpočet prechádza každý riadok a rešpektuje jeho DPH a zľavy
    document.querySelectorAll('.polozka-riadok').forEach(riadok => {
        const kategoria = riadok.dataset.kategoria || 'material';
        const mnoz = parseFloat(riadok.querySelector('.polozka-mnozstvo').value) || 0;
        const cena = parseFloat(riadok.querySelector('.polozka-cena').value) || 0;
        const dphSadzba = parseFloat(riadok.dataset.dph) || 23;

        if (sumyKat[kategoria] !== undefined) {
            const hrube = mnoz * cena;
            sumyKat[kategoria].hrube += hrube;

            const poKatZlave = hrube * (1 - zlavyPerc[kategoria] / 100);
            sumyKat[kategoria].dphKat += poKatZlave * (dphSadzba / 100);
            
            const poGlobalnejZlave = poKatZlave * (1 - zlavyPerc.globalna / 100);
            sumyKat[kategoria].dphCelkom += poGlobalnejZlave * (dphSadzba / 100);

            // Zápis do rekapitulácie
            if (platcaDPH) {
                if (!rekapitulaciaDPH[dphSadzba]) {
                    rekapitulaciaDPH[dphSadzba] = { zaklad: 0, dph: 0 };
                }
                rekapitulaciaDPH[dphSadzba].zaklad += poGlobalnejZlave;
                rekapitulaciaDPH[dphSadzba].dph += poGlobalnejZlave * (dphSadzba / 100);
            }
        }
    });

    let kategHtml = '';
    let zakladPredGlobalnou = 0;
    let sumaDPHFinálna = 0;
    const nazvyKategorii = { zariadenie: 'Zariadenia', material: 'Inštalačný materiál', praca: 'Práca a Služby' };

    // 3. Vykreslenie pre každú kategóriu zvlášť
    ['zariadenie', 'material', 'praca'].forEach(kat => {
        let medzisucet = sumyKat[kat].hrube;
        if (medzisucet > 0) {
            let zlavaSuma = medzisucet * (zlavyPerc[kat] / 100);
            let poZlave = medzisucet - zlavaSuma;
            let dphSumaKat = platcaDPH ? sumyKat[kat].dphKat : 0;
            let sDphSumaKat = poZlave + dphSumaKat;

            zakladPredGlobalnou += poZlave;
            sumaDPHFinálna += platcaDPH ? sumyKat[kat].dphCelkom : 0;

            kategHtml += `<div style="background: var(--input-bg-color, #2d2d2d); border: 1px solid var(--input-border-color, #4b5563); border-radius: 6px; padding: 12px; margin-bottom: 12px;">`;
            kategHtml += `<strong style="display: block; margin-bottom: 8px; color: var(--accent-color, #facc15); font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px;">${nazvyKategorii[kat]}</strong>`;
            
            if (zlavaSuma > 0) {
                kategHtml += `<div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--text-muted-color, #9ca3af); margin-bottom: 3px;"><span>Pôvodná cena:</span><span>${medzisucet.toFixed(2)} €</span></div>`;
                kategHtml += `<div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--danger-btn-bg-color, #ef4444); margin-bottom: 8px;"><span>Zľava (${zlavyPerc[kat]}%):</span><span>-${zlavaSuma.toFixed(2)} €</span></div>`;
            }
            
            if (platcaDPH) {
                kategHtml += `<div style="display: flex; justify-content: space-between; font-size: 14px; color: var(--text-color, #d1d5db); margin-bottom: 3px;"><span>Cena bez DPH:</span><span>${poZlave.toFixed(2)} €</span></div>`;
                kategHtml += `<div style="display: flex; justify-content: space-between; font-size: 14px; color: var(--text-muted-color, #9ca3af); margin-bottom: 8px;"><span>DPH:</span><span>${dphSumaKat.toFixed(2)} €</span></div>`;
                kategHtml += `<div style="display: flex; justify-content: space-between; font-size: 16px; color: var(--text-color, #ffffff); font-weight: bold; padding-top: 8px; border-top: 1px solid var(--input-border-color, #4b5563);"><span>Spolu s DPH:</span><span>${sDphSumaKat.toFixed(2)} €</span></div>`;
            } else {
                kategHtml += `<div style="display: flex; justify-content: space-between; font-size: 16px; color: var(--text-color, #ffffff); font-weight: bold; padding-top: 8px; border-top: 1px solid var(--input-border-color, #4b5563);"><span>Cena spolu:</span><span>${poZlave.toFixed(2)} €</span></div>`;
            }
            kategHtml += `</div>`;
        }
    });

    document.getElementById('rekapitulacia-kategorie').innerHTML = kategHtml || '<div style="text-align: center; color: var(--text-muted-color); font-size: 14px;">Zatiaľ neboli pridané žiadne položky.</div>';

    // 4. Globálna matematika a finálne sumy
    let zakladBezDPH = zakladPredGlobalnou;
    let globalZlavaHtml = '';
    
    if (zlavyPerc.globalna > 0 && zakladPredGlobalnou > 0) {
        let globalZlavaSuma = zakladPredGlobalnou * (zlavyPerc.globalna / 100);
        zakladBezDPH -= globalZlavaSuma;
        globalZlavaHtml = `<div style="display: flex; justify-content: space-between; color: var(--danger-btn-bg-color); font-size: 14px;"><span>Globálna zľava z celku (${zlavyPerc.globalna}%):</span><span>-${globalZlavaSuma.toFixed(2)} €</span></div>`;
    }
    document.getElementById('zobrazenie-aplikovanych-zliav-global').innerHTML = globalZlavaHtml;

    let konecnaSuma = zakladBezDPH + sumaDPHFinálna;

    if (platcaDPH) {
        document.getElementById('zobrazenie-zaklad-bez-dph').style.display = 'flex';
        document.getElementById('zobrazenie-dph').style.display = 'block'; 

        // Generovanie tabuľky rozpisu DPH do vizuálu
        let dphRozpisHtml = '';
        Object.keys(rekapitulaciaDPH).sort((a,b) => b - a).forEach(sadzba => {
            if (rekapitulaciaDPH[sadzba].zaklad > 0) {
                dphRozpisHtml += `<div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 5px; padding-bottom: 5px; border-bottom: 1px dashed var(--input-border-color);">
                    <span style="color: var(--text-muted-color);">Základ (${sadzba}%): <span style="color: var(--text-color);">${rekapitulaciaDPH[sadzba].zaklad.toFixed(2)} €</span></span>
                    <span style="color: var(--text-muted-color);">DPH: <span style="color: var(--text-color);">${rekapitulaciaDPH[sadzba].dph.toFixed(2)} €</span></span>
                </div>`;
            }
        });
        
        dphRozpisHtml += `<div style="display: flex; justify-content: space-between; font-size: 16px; margin-top: 10px;">
            <span>Celková DPH:</span>
            <span style="font-weight: bold;">${sumaDPHFinálna.toFixed(2)} €</span>
        </div>`;

        document.getElementById('zobrazenie-dph').innerHTML = dphRozpisHtml;
    } else {
        document.getElementById('zobrazenie-zaklad-bez-dph').style.display = 'none';
        document.getElementById('zobrazenie-dph').style.display = 'none';
    }

    document.getElementById('zaklad-bez-dph').innerText = zakladBezDPH.toFixed(2) + ' €';
    document.getElementById('konecna-suma').innerText = konecnaSuma.toFixed(2);
}

// ==========================================
// SPRÁVA KATALÓGU A BALÍČKOV
// ==========================================
document.getElementById('btn-typ-polozka').addEventListener('click', () => {
    document.getElementById('btn-typ-polozka').className = 'btn-primary btn-small';
    document.getElementById('btn-typ-balik').className = 'btn-secondary btn-small';
    document.getElementById('katalog-sekcia-polozka').style.display = 'block';
    document.getElementById('katalog-sekcia-balik').style.display = 'none';
    document.getElementById('katalog-typ-vstupu').value = 'polozka';
});

document.getElementById('btn-typ-balik').addEventListener('click', () => {
    document.getElementById('btn-typ-balik').className = 'btn-primary btn-small';
    document.getElementById('btn-typ-polozka').className = 'btn-secondary btn-small';
    document.getElementById('katalog-sekcia-polozka').style.display = 'none';
    document.getElementById('katalog-sekcia-balik').style.display = 'block';
    document.getElementById('katalog-typ-vstupu').value = 'balik';
    
    if(document.getElementById('zoznam-poloziek-balika').children.length === 0) {
        pridajRiadokDoBalika();
    }
});

document.getElementById('pridat-do-balika-btn').addEventListener('click', () => {
    pridajRiadokDoBalika();
});

function pridajRiadokDoBalika(kategoria='material', nazov='', mnoz=1, mj='ks', cena='') {
    const div = document.createElement('div');
    div.className = 'balik-polozka-riadok flex-row';
    div.style.marginBottom = '5px';
    div.innerHTML = `
        <select class="b-kat" style="flex: 1; padding: 6px; font-size: 14px;">
            <option value="zariadenie" ${kategoria==='zariadenie'?'selected':''}>🔵 Zariadenie</option>
            <option value="material" ${kategoria==='material'?'selected':''}>🟡 Materiál</option>
            <option value="praca" ${kategoria==='praca'?'selected':''}>🟢 Práca</option>
        </select>
        <input type="text" class="b-nazov" value="${nazov}" placeholder="Názov" style="flex: 2; padding: 6px; font-size: 14px;">
        <input type="number" class="b-mnoz" value="${mnoz}" placeholder="Mn." style="flex: 0.8; padding: 6px; font-size: 14px;">
        <select class="b-mj" style="flex: 0.8; padding: 6px; font-size: 14px;">
            <option value="ks" ${mj==='ks'?'selected':''}>ks</option>
            <option value="m" ${mj==='m'?'selected':''}>m</option>
            <option value="m2" ${mj==='m2'?'selected':''}>m²</option>
            <option value="m³" ${mj==='m³'?'selected':''}>m³</option>
            <option value="kg" ${mj==='kg'?'selected':''}>kg</option>
            <option value="km" ${mj==='km'?'selected':''}>km</option>
            <option value="hod" ${mj==='hod'?'selected':''}>hod</option>
            <option value="set" ${mj==='set'?'selected':''}>set</option>
            <option value="bal" ${mj==='bal'?'selected':''}>bal</option>
            <option value="kpl" ${mj==='kpl'?'selected':''}>kpl</option>
        </select>
        <input type="number" class="b-cena" value="${cena}" placeholder="€" style="flex: 1; padding: 6px; font-size: 14px;">
        <button type="button" class="btn-danger btn-small" onclick="this.parentElement.remove()" style="padding: 6px;">X</button>
    `;
    document.getElementById('zoznam-poloziek-balika').appendChild(div);
    
    const nazovInput = div.querySelector('.b-nazov');
    nazovInput.addEventListener('focus', (e) => ukazNasepkavac(e.target, true));
    nazovInput.addEventListener('input', (e) => ukazNasepkavac(e.target, false));
    nazovInput.addEventListener('blur', () => setTimeout(schovajNasepkavac, 250));
}

// Dynamické zobrazenie tlačidla pre Technický popis
document.getElementById('katalog-kategoria').addEventListener('change', function() {
    const btnPopis = document.getElementById('btn-ukaz-popis');
    const boxPopis = document.getElementById('box-technicky-popis');
    
    if (this.value === 'zariadenie') {
        btnPopis.style.display = boxPopis.style.display === 'block' ? 'none' : 'inline-block';
    } else {
        btnPopis.style.display = 'none';
        boxPopis.style.display = 'none';
        document.getElementById('katalog-popis').value = ''; // Vymažeme text, ak zmení kategóriu
    }
});

document.getElementById('btn-ukaz-popis').addEventListener('click', function() {
    this.style.display = 'none';
    document.getElementById('box-technicky-popis').style.display = 'block';
});

document.getElementById('ulozit-do-katalogu-btn').addEventListener('click', () => {
    const rezim = document.getElementById('katalog-typ-vstupu').value;
    const upravaId = document.getElementById('katalog-uprava-id').value;
    
    if (rezim === 'polozka') {
        const kategoria = document.getElementById('katalog-kategoria').value;
        const nazov = document.getElementById('katalog-nazov').value.trim();
        const mj = document.getElementById('katalog-mj').value;
        const cena = parseFloat(document.getElementById('katalog-cena').value);
        const dph = document.getElementById('katalog-dph').value;
        const popis = document.getElementById('katalog-popis').value.trim();

        if (nazov && !isNaN(cena)) {
            if (upravaId !== "") {
                katalog[parseInt(upravaId)] = { typ: 'polozka', kategoria, nazov, mj, cena, dph, popis }; 
            } else {
                katalog.push({ typ: 'polozka', kategoria, nazov, mj, cena, dph, popis }); 
            }
            
            // --- NOVÉ: Hromadná aktualizácia cien vo všetkých balíčkoch v katalógu ---
            katalog.forEach(katPolozka => {
                if (katPolozka.typ === 'balik' && katPolozka.polozky) {
                    katPolozka.polozky.forEach(bp => {
                        if (bp.nazov.trim().toLowerCase() === nazov.toLowerCase()) {
                            bp.cena = cena;
                            bp.dph = dph;
                        }
                    });
                }
            });
            // -------------------------------------------------------------------------
            
            dokonciUlozenieKatalogu();
        } else {
            alert('Vyplň názov a platnú cenu.');
        }
    } else {
        const nazovBalika = document.getElementById('balik-nazov').value.trim();
        const riadkyBalika = document.querySelectorAll('.balik-polozka-riadok');
        let polozkyUlozene = [];
        
        riadkyBalika.forEach(r => {
            const kat = r.querySelector('.b-kat').value;
            const naz = r.querySelector('.b-nazov').value.trim();
            const mnoz = parseFloat(r.querySelector('.b-mnoz').value) || 1;
            const mj = r.querySelector('.b-mj').value;
            const cena = parseFloat(r.querySelector('.b-cena').value) || 0;
            
            if (naz) {
                polozkyUlozene.push({ kategoria: kat, nazov: naz, mnozstvo: mnoz, mj: mj, cena: cena });
            }
        });
        
        if (nazovBalika && polozkyUlozene.length > 0) {
            if (upravaId !== "") {
                katalog[parseInt(upravaId)] = { typ: 'balik', nazov: nazovBalika, polozky: polozkyUlozene };
            } else {
                katalog.push({ typ: 'balik', nazov: nazovBalika, polozky: polozkyUlozene });
            }
            dokonciUlozenieKatalogu();
        } else {
            alert('Zadaj názov balíčka a aspoň jednu platnú položku dovnútra.');
        }
    }
});

function dokonciUlozenieKatalogu() {
    localStorage.setItem('easycena_katalog', JSON.stringify(katalog));
    if (typeof oznacZmeneny === 'function') oznacZmeneny('katalog');
    vykresliKatalog();
    
    document.getElementById('katalog-uprava-id').value = "";
    document.getElementById('katalog-nazov').value = '';
    document.getElementById('katalog-cena').value = '';
    document.getElementById('katalog-kategoria').value = 'material';
    document.getElementById('katalog-popis').value = '';
    document.getElementById('box-technicky-popis').style.display = 'none';
    document.getElementById('btn-ukaz-popis').style.display = 'none';
    
    // NOVÉ PREDVYPLNENIE DPH Z PROFILU:
    const profil = JSON.parse(localStorage.getItem('easycena_profil')) || {};
    document.getElementById('katalog-dph').value = profil.sadzbaDph || '23'; 
    
    document.getElementById('balik-nazov').value = '';
    document.getElementById('zoznam-poloziek-balika').innerHTML = '';
    document.getElementById('zrusit-upravu-btn').style.display = 'none';
    document.getElementById('katalog-form-nadpis').innerText = 'Pridať do katalógu';
    document.getElementById('btn-typ-polozka').click();
    alert('Uložené do katalógu.');
}

// Stav pohľadu na katalóg (hľadanie + filter + triedenie)
let katalogHladaj = '';
const _katalogView = JSON.parse(localStorage.getItem('easycena_katalog_view') || '{}');
let katalogFilter  = _katalogView.filter  || 'vsetky';   // vsetky | material | zariadenie | praca | balik | napoplnenie
let katalogTriedit = _katalogView.triedit || 'nazov-asc'; // nazov-asc | nazov-desc | cena-asc | cena-desc

function _ulozKatalogView() {
    localStorage.setItem('easycena_katalog_view', JSON.stringify({
        filter: katalogFilter,
        triedit: katalogTriedit
    }));
}

// Helper: virtuálna cena pre triedenie — položka má vlastnú cenu, balíček počíta sumu
function _katalogCenaPreTriedenie(p) {
    if (p.typ === 'balik' && Array.isArray(p.polozky)) {
        return p.polozky.reduce((s, x) => s + (parseFloat(x.cena) || 0) * (parseFloat(x.mnozstvo) || 0), 0);
    }
    return parseFloat(p.cena) || 0;
}

function vykresliKatalog() {
    const zoznam = document.getElementById('zoznam-v-katalogu');
    const statBox = document.getElementById('katalog-statistiky');
    zoznam.innerHTML = '';

    // 1a. Filter podľa typu (Všetky / Materiál / Zariadenie / Práca / Balíček / Na doplnenie)
    let zoradenyKatalog = katalog.filter(p => {
        if (katalogFilter === 'vsetky')      return true;
        if (katalogFilter === 'balik')       return p.typ === 'balik';
        if (katalogFilter === 'napoplnenie') return !!p.vyzadujeKontrolu;
        // material / zariadenie / praca — len bežné položky príslušnej kategórie
        return p.typ !== 'balik' && p.kategoria === katalogFilter;
    });

    // 1b. Filter podľa hľadania (názov položky/balíčka, bez diakritiky)
    const hladaj = _bezDiakritiky(katalogHladaj.trim());
    if (hladaj !== '') {
        zoradenyKatalog = zoradenyKatalog.filter(p => _bezDiakritiky(p.nazov).includes(hladaj));
    }

    // 1c. Triedenie
    zoradenyKatalog = zoradenyKatalog.slice();
    if (katalogTriedit === 'nazov-asc') {
        zoradenyKatalog.sort((a, b) => a.nazov.localeCompare(b.nazov, 'sk'));
    } else if (katalogTriedit === 'nazov-desc') {
        zoradenyKatalog.sort((a, b) => b.nazov.localeCompare(a.nazov, 'sk'));
    } else if (katalogTriedit === 'cena-desc') {
        zoradenyKatalog.sort((a, b) => _katalogCenaPreTriedenie(b) - _katalogCenaPreTriedenie(a));
    } else if (katalogTriedit === 'cena-asc') {
        zoradenyKatalog.sort((a, b) => _katalogCenaPreTriedenie(a) - _katalogCenaPreTriedenie(b));
    }

    // 3. Štatistiky (počítané z celého katalógu, aby boli stabilné)
    if (statBox) {
        const pocetPoloziek = katalog.filter(p => p.typ !== 'balik').length;
        const pocetBalickov = katalog.filter(p => p.typ === 'balik').length;
        const pocetNaDoplnenie = katalog.filter(p => p.vyzadujeKontrolu).length;
        const zobrazene = zoradenyKatalog.length;
        const celkom = katalog.length;
        const filtrAktivny = (hladaj !== '' || katalogFilter !== 'vsetky');

        const ozn = (filtrAktivny && zobrazene !== celkom)
            ? `<span class="stat-item">📂 Zobrazené: <span class="stat-cislo">${zobrazene}</span> z ${celkom}</span>`
            : `<span class="stat-item">📦 Položiek: <span class="stat-cislo">${pocetPoloziek}</span></span>
               <span class="stat-item">📋 Balíčkov: <span class="stat-cislo">${pocetBalickov}</span></span>`;

        const varovanie = pocetNaDoplnenie > 0
            ? `<span class="stat-item">⚠️ Na doplnenie: <span class="stat-warn">${pocetNaDoplnenie}</span></span>`
            : '';

        statBox.innerHTML = ozn + varovanie;
    }

    // 4. Prázdny stav
    if (zoradenyKatalog.length === 0) {
        const prazdny = document.createElement('div');
        prazdny.className = 'katalog-prazdny';
        if (katalog.length === 0) {
            prazdny.innerText = 'Katalóg je zatiaľ prázdny. Pridaj prvú položku alebo balíček vyššie.';
        } else if (hladaj !== '') {
            prazdny.innerText = 'Žiadna položka neodpovedá hľadanému výrazu.';
        } else {
            prazdny.innerText = 'V tomto filtri nie sú žiadne položky.';
        }
        zoznam.appendChild(prazdny);
        return;
    }

    zoradenyKatalog.forEach((polozka) => {
        const povodnyIndex = katalog.indexOf(polozka);
        const div = document.createElement('div');
        div.className = 'katalog-karta';
        if (polozka.vyzadujeKontrolu) div.classList.add('varovanie');

        // Trieda farebnej bodky podľa typu/kategórie (rovnako ako v našepkávači a v zozname ponuky)
        const triedaBodky = polozka.typ === 'balik'
            ? 'k-balik'
            : (polozka.kategoria === 'zariadenie' ? 'k-zariadenie'
                : polozka.kategoria === 'praca' ? 'k-praca'
                : 'k-material');

        // Štítok varovania pre vyzadujeKontrolu
        const stitokWarn = polozka.vyzadujeKontrolu
            ? '<span class="katalog-karta-stitok-warn">⚠️ Doplniť cenu / DPH</span>'
            : '';

        // Nadpis a detail riadok podľa typu
        let nazovHtml, detailHtml;
        if (polozka.typ === 'balik') {
            const pocet = polozka.polozky ? polozka.polozky.length : 0;
            const sumaBalika = (polozka.polozky || []).reduce((sum, p) => sum + ((parseFloat(p.cena) || 0) * (parseFloat(p.mnozstvo) || 0)), 0);
            nazovHtml  = `📦 ${polozka.nazov}`;
            detailHtml = `Balíček (${pocet} položiek) — cca ${sumaBalika.toFixed(2)} €`;
        } else {
            const cena = (parseFloat(polozka.cena) || 0).toFixed(2);
            nazovHtml  = polozka.nazov;
            detailHtml = `${cena} € / ${polozka.mj || 'ks'}`;
        }

        div.innerHTML = `
            <span class="katalog-karta-bodka ${triedaBodky}"></span>
            <div class="katalog-karta-info">
                <span class="katalog-karta-nazov">${nazovHtml}${stitokWarn}</span>
                <div class="katalog-karta-detail">${detailHtml}</div>
            </div>
            <div class="katalog-karta-tlacidla">
                <button class="btn-secondary btn-small" onclick="duplikujKatalog(${povodnyIndex})" title="Duplikovať">📄</button>
                <button class="btn-secondary btn-small" onclick="upravKatalog(${povodnyIndex})" title="Upraviť">✏️</button>
                <button class="btn-danger btn-small" onclick="zmazZKatalogu(${povodnyIndex})" title="Zmazať">X</button>
            </div>
        `;
        zoznam.appendChild(div);
    });
}

// ==========================================
// VYHĽADÁVANIE / FILTER / TRIEDENIE V KATALÓGU
// ==========================================
(function initKatalogOvladace() {
    const input = document.getElementById('katalog-hladaj');
    const wrap  = document.getElementById('katalog-search-wrap');
    const clear = document.getElementById('katalog-hladaj-clear');
    const filterBox = document.getElementById('katalog-filter');
    const triedit   = document.getElementById('katalog-triedit');
    if (!input || !wrap || !clear || !filterBox || !triedit) return;

    // --- Search ---
    const refreshSearch = () => {
        katalogHladaj = input.value;
        wrap.classList.toggle('has-value', input.value.length > 0);
        vykresliKatalog();
    };
    input.addEventListener('input', refreshSearch);
    clear.addEventListener('click', () => {
        input.value = '';
        katalogHladaj = '';
        wrap.classList.remove('has-value');
        input.focus();
        vykresliKatalog();
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && input.value !== '') {
            e.preventDefault();
            input.value = '';
            katalogHladaj = '';
            wrap.classList.remove('has-value');
            vykresliKatalog();
        }
    });

    // --- Filter pills (typ položky) ---
    const oznacAktivnyFilter = () => {
        filterBox.querySelectorAll('.katalog-pill').forEach(btn => {
            btn.classList.toggle('aktivny', btn.dataset.filter === katalogFilter);
        });
    };
    oznacAktivnyFilter();
    filterBox.addEventListener('click', (e) => {
        const btn = e.target.closest('.katalog-pill');
        if (!btn) return;
        katalogFilter = btn.dataset.filter || 'vsetky';
        oznacAktivnyFilter();
        _ulozKatalogView();
        vykresliKatalog();
    });

    // --- Triedenie ---
    triedit.value = katalogTriedit;
    if (triedit.value === '') {
        triedit.value = 'nazov-asc';
        katalogTriedit = 'nazov-asc';
    }
    triedit.addEventListener('change', () => {
        katalogTriedit = triedit.value;
        _ulozKatalogView();
        vykresliKatalog();
    });
})();

function upravKatalog(index) {
    const p = katalog[index];
    document.getElementById('katalog-uprava-id').value = index;
    document.getElementById('zrusit-upravu-btn').style.display = 'block';
    window.scrollTo(0, 0);

    if (p.typ === 'balik') {
        document.getElementById('katalog-form-nadpis').innerText = 'Úprava balíčka';
        document.getElementById('btn-typ-balik').className = 'btn-primary btn-small';
        document.getElementById('btn-typ-polozka').className = 'btn-secondary btn-small';
        document.getElementById('katalog-sekcia-polozka').style.display = 'none';
        document.getElementById('katalog-sekcia-balik').style.display = 'block';
        document.getElementById('katalog-typ-vstupu').value = 'balik';
        document.getElementById('balik-nazov').value = p.nazov;
        
        const zoznamBalika = document.getElementById('zoznam-poloziek-balika');
        zoznamBalika.innerHTML = ''; 
        p.polozky.forEach(pol => pridajRiadokDoBalika(pol.kategoria, pol.nazov, pol.mnozstvo, pol.mj, pol.cena));
    } else {
        document.getElementById('katalog-form-nadpis').innerText = 'Úprava položky';
        document.getElementById('btn-typ-polozka').className = 'btn-primary btn-small';
        document.getElementById('btn-typ-balik').className = 'btn-secondary btn-small';
        document.getElementById('katalog-sekcia-polozka').style.display = 'block';
        document.getElementById('katalog-sekcia-balik').style.display = 'none';
        document.getElementById('katalog-typ-vstupu').value = 'polozka';
        document.getElementById('katalog-kategoria').value = p.kategoria;
        document.getElementById('katalog-nazov').value = p.nazov;
        if(p.mj) document.getElementById('katalog-mj').value = p.mj;
        document.getElementById('katalog-cena').value = p.cena;
        document.getElementById('katalog-popis').value = p.popis || '';
        if (p.kategoria === 'zariadenie') {
            document.getElementById('btn-ukaz-popis').style.display = p.popis ? 'none' : 'inline-block';
            document.getElementById('box-technicky-popis').style.display = p.popis ? 'block' : 'none';
        } else {
            document.getElementById('btn-ukaz-popis').style.display = 'none';
            document.getElementById('box-technicky-popis').style.display = 'none';
        }
    }
}

function duplikujKatalog(index) {
    // 1. Zavoláme existujúcu funkciu na úpravu (tá nám pohodlne vyplní celý formulár dátami)
    upravKatalog(index);
    
    // 2. Trik: Okamžite zmažeme "ID úpravy". Tým pádom si apka pri ukladaní 
    // bude myslieť, že ide o úplne novú položku a neprepíše ti ten pôvodný originál.
    document.getElementById('katalog-uprava-id').value = "";
    
    // 3. Upravíme nadpis, aby si vedel, že robíš kópiu
    const p = katalog[index];
    if (p.typ === 'balik') {
        document.getElementById('katalog-form-nadpis').innerText = 'Pridať kópiu balíčka';
    } else {
        document.getElementById('katalog-form-nadpis').innerText = 'Pridať kópiu položky';
    }
}

document.getElementById('zrusit-upravu-btn').addEventListener('click', () => {
    document.getElementById('katalog-uprava-id').value = "";
    document.getElementById('katalog-nazov').value = "";
    document.getElementById('katalog-cena').value = "";
    document.getElementById('balik-nazov').value = "";
    document.getElementById('zoznam-poloziek-balika').innerHTML = '';
    document.getElementById('zrusit-upravu-btn').style.display = 'none';
    document.getElementById('katalog-form-nadpis').innerText = 'Pridať do katalógu';
    document.getElementById('btn-typ-polozka').click();
});

function zmazZKatalogu(index) {
    if(confirm("Zmazať z katalógu?")) {
        katalog.splice(index, 1);
        localStorage.setItem('easycena_katalog', JSON.stringify(katalog));
        if (typeof oznacZmeneny === 'function') oznacZmeneny('katalog');
        vykresliKatalog();
    }
}

// ==========================================
// ARCHÍV
// ==========================================
document.getElementById('ulozit-archiv-btn').addEventListener('click', () => {
    ulozRozpracovanuPonuku();
    const data = JSON.parse(localStorage.getItem('easycena_rozpracovana'));

    data.datum = new Date().toLocaleDateString('sk-SK');
    data.sumaZobrazena = document.getElementById('konecna-suma').innerText;
    // Uloženie vlajky, ak ukladáme Súpis prác
    if (window.jeRezimSupis) {
        data.obsahujeSupis = true;
    }

    // Per-record timestamp pre 3-way merge — vždy aktuálny pri ukladaní
    data.modifiedAt = Date.now();

    // --- NOVÁ LOGIKA: Ochrana proti duplicitám v archíve ---
    // Skontrolujeme, či ponuka s rovnakým číslom už v archíve existuje
    const existujuciIndex = archiv.findIndex(p => p.cislo === data.cislo);

    if (existujuciIndex !== -1) {
        // Ponuka existuje: Zachováme jej pôvodné technické ID a len prepíšeme dáta
        data.id = archiv[existujuciIndex].id;
        archiv[existujuciIndex] = data;
    } else {
        // Ponuka neexistuje: Vytvoríme novú s novým technickým ID a dáme ju na vrch
        data.id = Date.now();
        archiv.unshift(data);
    }
    // --------------------------------------------------------

    localStorage.setItem('easycena_archiv', JSON.stringify(archiv));
    localStorage.setItem('easycena_rozpracovana', JSON.stringify(data)); // Uložíme späť aj s prideleným ID
    if (typeof oznacZmeneny === 'function') oznacZmeneny('archiv');
    vykresliArchiv();

    alert('Úspešne uložené v archíve.');
});

// Stav pohľadu na archív (hľadanie + filter + triedenie)
let archivHladaj = '';
const _archivView = JSON.parse(localStorage.getItem('easycena_archiv_view') || '{}');
let archivFilter  = _archivView.filter  || 'vsetky';     // vsetky | bezsupisu | sosupisom
let archivTriedit = _archivView.triedit || 'najnovsie';  // najnovsie | najstarsie | suma-desc | suma-asc | meno-asc

function _ulozArchivView() {
    localStorage.setItem('easycena_archiv_view', JSON.stringify({
        filter: archivFilter,
        triedit: archivTriedit
    }));
}

// Helper: bezdiakritický lowercase pre vyhľadávanie
function _bezDiakritiky(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Helper: parsovanie sumaZobrazena ("1234.56") na číslo
function _parsujSumu(s) {
    if (s == null) return 0;
    const cislo = parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
    return isNaN(cislo) ? 0 : cislo;
}

function vykresliArchiv() {
    const zoznam = document.getElementById('zoznam-archivu');
    const statBox = document.getElementById('archiv-statistiky');
    zoznam.innerHTML = '';

    // 1a. Filter podľa stavu (Všetky / Bez súpisu / So súpisom)
    let filtrovane = archiv.filter(p => {
        if (archivFilter === 'sosupisom') return !!p.obsahujeSupis;
        if (archivFilter === 'bezsupisu') return !p.obsahujeSupis;
        return true;
    });

    // 1b. Filter podľa hľadania (cislo, meno, datum)
    const hladaj = _bezDiakritiky(archivHladaj.trim());
    if (hladaj !== '') {
        filtrovane = filtrovane.filter(p => {
            const cislo = _bezDiakritiky(p.cislo);
            const meno  = _bezDiakritiky(p.meno);
            const datum = _bezDiakritiky(p.datum);
            return cislo.includes(hladaj) || meno.includes(hladaj) || datum.includes(hladaj);
        });
    }

    // 1c. Triedenie
    filtrovane = filtrovane.slice(); // kópia, aby sme nemenili pôvodné poradie v archiv[]
    if (archivTriedit === 'najnovsie') {
        filtrovane.sort((a, b) => (b.id || 0) - (a.id || 0));
    } else if (archivTriedit === 'najstarsie') {
        filtrovane.sort((a, b) => (a.id || 0) - (b.id || 0));
    } else if (archivTriedit === 'suma-desc') {
        filtrovane.sort((a, b) => _parsujSumu(b.sumaZobrazena) - _parsujSumu(a.sumaZobrazena));
    } else if (archivTriedit === 'suma-asc') {
        filtrovane.sort((a, b) => _parsujSumu(a.sumaZobrazena) - _parsujSumu(b.sumaZobrazena));
    } else if (archivTriedit === 'meno-asc') {
        filtrovane.sort((a, b) => String(a.meno || '').localeCompare(String(b.meno || ''), 'sk'));
    }

    // 2. Štatistiky (počítané z filtrovaných záznamov, ale s celkovým kontextom)
    if (statBox) {
        const pocet = filtrovane.length;
        const celkovyPocet = archiv.length;
        const suma = filtrovane.reduce((s, p) => s + _parsujSumu(p.sumaZobrazena), 0);
        const soSupisom = filtrovane.filter(p => p.obsahujeSupis).length;

        const ozn = (hladaj && pocet !== celkovyPocet)
            ? `<span class="stat-item">📂 Zobrazené: <span class="stat-cislo">${pocet}</span> z ${celkovyPocet}</span>`
            : `<span class="stat-item">📂 Celkom: <span class="stat-cislo">${pocet}</span> ponúk</span>`;

        statBox.innerHTML = `
            ${ozn}
            <span class="stat-item">💰 Spolu: <span class="stat-suma">${suma.toFixed(2)} €</span></span>
            <span class="stat-item">✓ So súpisom: <span class="stat-cislo">${soSupisom}</span></span>
        `;
    }

    // 3. Vykreslenie zoznamu
    if (filtrovane.length === 0) {
        const prazdny = document.createElement('div');
        prazdny.className = 'archiv-prazdny';
        prazdny.innerText = archiv.length === 0
            ? 'Archív je zatiaľ prázdny. Po uložení ponuky sa tu objaví.'
            : 'Žiadna ponuka neodpovedá hľadanému výrazu.';
        zoznam.appendChild(prazdny);
        return;
    }

    filtrovane.forEach(ponuka => {
        const div = document.createElement('div');
        div.className = 'archiv-karta';

        const stitokHtml = ponuka.obsahujeSupis
            ? '<span class="archiv-stitok zeleny">✓ Súpis</span>'
            : '<span class="archiv-stitok neutralny">📝 Iba ponuka</span>';

        const btnSupisHtml = ponuka.obsahujeSupis
            ? `<button class="btn-success btn-small archiv-btn-supis archiv-btn-supis-otvor" onclick="vytvorSupisPrac(${ponuka.id})">✏️ Otvoriť Súpis prác</button>`
            : `<button class="btn-success btn-small archiv-btn-supis" onclick="vytvorSupisPrac(${ponuka.id})">📝 Vytvoriť Súpis prác</button>`;

        div.innerHTML = `
            <div class="archiv-karta-hlavicka">
                <div class="archiv-karta-cislo">
                    ${ponuka.cislo || 'Bez-čísla'}
                    ${stitokHtml}
                </div>
                <div class="archiv-karta-suma">${ponuka.sumaZobrazena} €</div>
            </div>
            <div class="archiv-karta-zakaznik">
                ${ponuka.meno || 'Neznámy zákazník'}
                <span class="archiv-karta-datum">(${ponuka.datum})</span>
            </div>
            <div class="archiv-karta-tlacidla">
                ${btnSupisHtml}
                <button class="btn-primary btn-small archiv-btn-duplikuj" onclick="duplikujZArchivu(${ponuka.id})">Duplikovať</button>
                <button class="btn-secondary btn-small archiv-btn-otvor" onclick="nacitajZArchivu(${ponuka.id})">Otvoriť</button>
                <button class="btn-danger btn-small" onclick="zmazZArchivu(${ponuka.id})">Zmazať</button>
            </div>
        `;
        zoznam.appendChild(div);
    });
}

// ==========================================
// VYHĽADÁVANIE / FILTER / TRIEDENIE V ARCHÍVE
// ==========================================
(function initArchivOvladace() {
    const input = document.getElementById('archiv-hladaj');
    const wrap  = document.getElementById('archiv-search-wrap');
    const clear = document.getElementById('archiv-hladaj-clear');
    const filterBox = document.getElementById('archiv-filter');
    const triedit   = document.getElementById('archiv-triedit');
    if (!input || !wrap || !clear || !filterBox || !triedit) return;

    // --- Search ---
    const refreshSearch = () => {
        archivHladaj = input.value;
        wrap.classList.toggle('has-value', input.value.length > 0);
        vykresliArchiv();
    };
    input.addEventListener('input', refreshSearch);
    clear.addEventListener('click', () => {
        input.value = '';
        archivHladaj = '';
        wrap.classList.remove('has-value');
        input.focus();
        vykresliArchiv();
    });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && input.value !== '') {
            e.preventDefault();
            input.value = '';
            archivHladaj = '';
            wrap.classList.remove('has-value');
            vykresliArchiv();
        }
    });

    // --- Filter pills (stav so súpisom) ---
    const oznacAktivnyFilter = () => {
        filterBox.querySelectorAll('.archiv-pill').forEach(btn => {
            btn.classList.toggle('aktivny', btn.dataset.filter === archivFilter);
        });
    };
    oznacAktivnyFilter();
    filterBox.addEventListener('click', (e) => {
        const btn = e.target.closest('.archiv-pill');
        if (!btn) return;
        archivFilter = btn.dataset.filter || 'vsetky';
        oznacAktivnyFilter();
        _ulozArchivView();
        vykresliArchiv();
    });

    // --- Triedenie ---
    triedit.value = archivTriedit;
    // Ak localStorage obsahuje neznámu hodnotu (napr. po update), select.value sa nenastaví
    // a vrátime ho na default.
    if (triedit.value === '') {
        triedit.value = 'najnovsie';
        archivTriedit = 'najnovsie';
    }
    triedit.addEventListener('change', () => {
        archivTriedit = triedit.value;
        _ulozArchivView();
        vykresliArchiv();
    });
})();

function zmazZArchivu(id) {
    if(confirm('Naozaj zmazať z archívu?')) {
        archiv = archiv.filter(p => p.id !== id);
        localStorage.setItem('easycena_archiv', JSON.stringify(archiv));
        if (typeof oznacZmeneny === 'function') oznacZmeneny('archiv');
        vykresliArchiv();
    }
}

function nacitajZArchivu(id) {
    if(!confirm('Aktuálne rozpísaná ponuka sa prepíše. Pokračovať?')) return;
    const ponuka = archiv.find(p => p.id === id);
    if(ponuka) {
        // Hlboká kópia — aby sme úpravami neovplyvnili záznam v archíve
        const dataNaPlochu = JSON.parse(JSON.stringify(ponuka));

        // DÔLEŽITÉ: "Otvoriť" znamená otvoriť ako CENOVÚ PONUKU, aj keď bola
        // ponuka v archíve naposledy uložená v režime Súpis prác. Pre režim
        // súpisu existuje samostatné tlačidlo "Otvoriť Súpis prác".
        dataNaPlochu.rezimSupisPrac = false;
        if (Array.isArray(dataNaPlochu.polozky)) {
            dataNaPlochu.polozky.forEach(p => {
                if (p.typRiadku === 'balik' && Array.isArray(p.polozky)) {
                    p.polozky.forEach(bp => { delete bp.zamknutaCena; });
                } else {
                    delete p.zamknutaCena;
                }
            });
        }
        if (Array.isArray(dataNaPlochu.zlavy)) {
            dataNaPlochu.zlavy.forEach(z => { delete z.zamknuta; });
        }
        // Pre istotu vypneme režim aj na úrovni runtime, kým bežíme obnovu
        window.jeRezimSupis = false;

        localStorage.setItem('easycena_rozpracovana', JSON.stringify(dataNaPlochu));
        obnovRozpracovanuPonuku();
        prepocitajSumy();
        document.querySelector('.nav-item').click();
    }
}

function vytvorSupisPrac(id) {
    if(!confirm('Aktuálne rozpísaná ponuka na ploche sa prepíše a otvorí sa Súpis prác k tejto zmluve. Pokračovať?')) return;
    
    const ponuka = archiv.find(p => p.id === id);
    if(ponuka) {
        let supisData = JSON.parse(JSON.stringify(ponuka));
        supisData.rezimSupisPrac = true;

        // --- NOVÉ: INJEKCIA ZÁMKU PRE STARÉ POLOŽKY A ZĽAVY ---
        if (supisData.polozky) {
            supisData.polozky.forEach(p => {
                if (p.typRiadku === 'balik') {
                    p.polozky.forEach(bp => bp.zamknutaCena = 'ano');
                } else {
                    p.zamknutaCena = 'ano';
                }
            });
        }
        if (supisData.zlavy) {
            supisData.zlavy.forEach(z => z.zamknuta = 'ano');
        }
        // ------------------------------------------------------

        localStorage.setItem('easycena_rozpracovana', JSON.stringify(supisData));
        obnovRozpracovanuPonuku();
        prepocitajSumy();
        document.querySelector('.nav-item').click();
    }
}

function duplikujZArchivu(id) {
    if(!confirm('Aktuálne rozpísaná ponuka na pracovnej ploche sa prepíše novou kópiou. Pokračovať?')) return;
    
    const staraPonuka = archiv.find(p => p.id === id);
    if(!staraPonuka) return;

    // Vytvoríme hlbokú kópiu, aby sme omylom neprepísali originál v archíve
    let novaPonuka = JSON.parse(JSON.stringify(staraPonuka));

    // 1. Zmažeme staré identifikátory a dátumy, aby to bola "nová" ponuka
    delete novaPonuka.id;
    delete novaPonuka.datum;
    delete novaPonuka.sumaZobrazena;
    novaPonuka.datumVystavenia = new Date().toISOString().split('T')[0];
    novaPonuka.platnostDo = ''; // Nech sa vypočíta štandardných 30 dní

    // 1b. DÔLEŽITÉ: Ak sa duplikuje ponuka, ktorá bola uložená ako Súpis prác,
    // nesmieme zdediť súpisové flagy — má vzniknúť čistá NOVÁ cenová ponuka.
    novaPonuka.rezimSupisPrac = false;
    delete novaPonuka.obsahujeSupis;
    if (Array.isArray(novaPonuka.polozky)) {
        novaPonuka.polozky.forEach(p => {
            if (p.typRiadku === 'balik' && Array.isArray(p.polozky)) {
                p.polozky.forEach(bp => { delete bp.zamknutaCena; });
            } else {
                delete p.zamknutaCena;
            }
        });
    }
    if (Array.isArray(novaPonuka.zlavy)) {
        novaPonuka.zlavy.forEach(z => { delete z.zamknuta; });
    }
    // Pre istotu vypneme režim aj na úrovni runtime, kým sa volá obnovRozpracovanuPonuku()
    window.jeRezimSupis = false;
    
    // 2. Inteligentná kontrola cien z Katalógu
    let zmenenePolozky = [];
    const aktualnyKatalog = JSON.parse(localStorage.getItem('easycena_katalog')) || [];
    
    if (novaPonuka.polozky) {
        novaPonuka.polozky.forEach(p => {
            if (p.typRiadku === 'balik') {
                p.polozky.forEach(bp => {
                    // Hľadáme presnú zhodu v katalógu podľa názvu (ignorujeme veľké/malé písmená)
                    const vKatalogu = aktualnyKatalog.find(k => k.typ === 'polozka' && k.nazov.trim().toLowerCase() === bp.nazov.trim().toLowerCase());
                    if (vKatalogu && (parseFloat(vKatalogu.cena) !== parseFloat(bp.cena) || parseFloat(vKatalogu.dph) !== parseFloat(bp.dph))) {
                        let rozdiel = parseFloat(vKatalogu.cena) - parseFloat(bp.cena);
                        let znamienko = rozdiel > 0 ? '+' : '';
                        bp.upozornenie = `${znamienko}${rozdiel.toFixed(2)} €`; 
                        
                        zmenenePolozky.push(`- ${bp.nazov} (Nová cena: ${vKatalogu.cena} €)`);
                        bp.cena = vKatalogu.cena;
                        bp.dph = vKatalogu.dph;
                    }
                });
            } else {
                const vKatalogu = aktualnyKatalog.find(k => k.typ === 'polozka' && k.nazov.trim().toLowerCase() === p.nazov.trim().toLowerCase());
                if (vKatalogu && (parseFloat(vKatalogu.cena) !== parseFloat(p.cena) || parseFloat(vKatalogu.dph) !== parseFloat(p.dph))) {
                    let rozdiel = parseFloat(vKatalogu.cena) - parseFloat(p.cena);
                    let znamienko = rozdiel > 0 ? '+' : '';
                    p.upozornenie = `${znamienko}${rozdiel.toFixed(2)} €`; 
                    
                    zmenenePolozky.push(`- ${p.nazov} (Nová cena: ${vKatalogu.cena} €)`);
                    p.cena = vKatalogu.cena;
                    p.dph = vKatalogu.dph;
                }
            }
        });
    }

    // 3. Pošleme zaktualizovanú kópiu na pracovnú plochu
    localStorage.setItem('easycena_rozpracovana', JSON.stringify(novaPonuka));
    
    // 4. Prekreslíme plochu a OBRATOM jej vygenerujeme ÚPLNE NOVÉ číslo
    obnovRozpracovanuPonuku();
    generujNoveCislo(); 
    prepocitajSumy();
    ulozRozpracovanuPonuku(); // Definitívne uloženie nového stavu
    
    // 5. Presmerujeme používateľa a dáme mu hlásenie
    document.querySelector('.nav-item').click(); 
    
    if (zmenenePolozky.length > 0) {
        alert('Ponuka bola úspešne duplikovaná s NOVÝM číslom.\n\n⚠️ POZOR: Tieto položky boli zaktualizované podľa aktuálneho cenníka:\n' + zmenenePolozky.join('\n'));
    } else {
        alert('Ponuka bola úspešne duplikovaná s NOVÝM číslom.\nVšetky ceny sú aktuálne.');
    }
}

// ==========================================
// PROFIL A ZÁLOHA
// ==========================================
document.getElementById('som-platca-dph').addEventListener('change', function() {
    document.getElementById('moje-ic-dph').style.display = this.checked ? 'block' : 'none';
    document.getElementById('profil-sadzba-dph').style.display = this.checked ? 'block' : 'none'; // NOVÝ RIADOK
    document.getElementById('katalog-cena').placeholder = this.checked ? 'Cena bez DPH (€)' : 'Cena (€)';
    prepocitajSumy();
});

document.getElementById('ulozit-profil-btn').addEventListener('click', () => {
    const profil = {
        firma: document.getElementById('moja-firma').value,
        ulica: document.getElementById('moja-ulica').value,
        mesto: document.getElementById('moje-mesto').value,
        ico: document.getElementById('moje-ico').value,
        dic: document.getElementById('moje-dic').value,
        dph: document.getElementById('som-platca-dph').checked,
        icdph: document.getElementById('moje-ic-dph').value,
        telefon: document.getElementById('moj-telefon').value,
        email: document.getElementById('moj-email').value,
        sablonaCisla: document.getElementById('profil-sablona-cisla').value || 'CP-{ROK}-{CISLO}',
        sadzbaDph: document.getElementById('profil-sadzba-dph').value,
        kontaktnaOsoba: document.getElementById('profil-kontaktna-osoba').value,
        miestoVystavenia: document.getElementById('profil-miesto-vystavenia').value,
        zapisRegister: document.getElementById('profil-zapis-register').value,
        poznamka1: document.getElementById('profil-poznamka-1').value,
        informacia2: document.getElementById('profil-informacia-2').value,
        textPodpisu: document.getElementById('profil-text-podpisu').value
    };
    localStorage.setItem('easycena_profil', JSON.stringify(profil));
    if (typeof oznacZmeneny === 'function') oznacZmeneny('profil');

    let noveCislo = parseInt(document.getElementById('profil-pocitadlo').value) || 1;
    let aktualnyRok = new Date().getFullYear();
    let pocitadlo = JSON.parse(localStorage.getItem('pocitadloPonuk')) || { rok: aktualnyRok, pocet: 0 };

    pocitadlo.pocet = noveCislo - 1;
    localStorage.setItem('pocitadloPonuk', JSON.stringify(pocitadlo));

    alert('Profil uložený.');
});

function nacitajProfil() {
    const profil = JSON.parse(localStorage.getItem('easycena_profil'));
    if (profil) {
        document.getElementById('moja-firma').value = profil.firma || '';
        document.getElementById('moja-ulica').value = profil.ulica || '';
        document.getElementById('moje-mesto').value = profil.mesto || '';
        document.getElementById('moje-ico').value = profil.ico || '';
        document.getElementById('moje-dic').value = profil.dic || '';
        document.getElementById('som-platca-dph').checked = profil.dph || false;
        document.getElementById('moje-ic-dph').value = profil.icdph || '';
        document.getElementById('moje-ic-dph').style.display = profil.dph ? 'block' : 'none';
        document.getElementById('profil-sadzba-dph').value = profil.sadzbaDph || ''; 
        document.getElementById('profil-sadzba-dph').style.display = profil.dph ? 'block' : 'none';
        document.getElementById('katalog-cena').placeholder = profil.dph ? 'Cena bez DPH (€)' : 'Cena (€)';
        document.getElementById('moj-telefon').value = profil.telefon || '';
        document.getElementById('moj-email').value = profil.email || '';
        document.getElementById('profil-sablona-cisla').value = profil.sablonaCisla || 'CP-{ROK}-{CISLO}';
        document.getElementById('profil-kontaktna-osoba').value = profil.kontaktnaOsoba || '';
        if(profil.miestoVystavenia !== undefined) document.getElementById('profil-miesto-vystavenia').value = profil.miestoVystavenia;
        document.getElementById('profil-zapis-register').value = profil.zapisRegister || '';
        document.getElementById('profil-poznamka-1').value = profil.poznamka1 || '';
        document.getElementById('profil-informacia-2').value = profil.informacia2 || '';
        document.getElementById('profil-text-podpisu').value = profil.textPodpisu || '';
    }
    
    let aktualnyRok = new Date().getFullYear();
    let pocitadlo = JSON.parse(localStorage.getItem('pocitadloPonuk')) || { rok: aktualnyRok, pocet: 0 };
    document.getElementById('profil-pocitadlo').value = pocitadlo.pocet + 1;
}


// ==========================================
// NAHRÁVANIE A SPRÁVA LOGA
// ==========================================
function vykresliNahladLoga() {
    const logoBase64 = localStorage.getItem('easycena_logo');
    const box = document.getElementById('logo-nahlad-box');
    const img = document.getElementById('logo-preview');
    
    if (logoBase64) {
        img.src = logoBase64;
        box.style.display = 'flex';
    } else {
        box.style.display = 'none';
        document.getElementById('nahrat-logo').value = '';
    }
}

document.getElementById('nahrat-logo').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const vyslednyBase64 = event.target.result;
        localStorage.setItem('easycena_logo', vyslednyBase64);
        vykresliNahladLoga();
        alert('Logo bolo úspešne nahraté.');
    };
    reader.readAsDataURL(file);
});

document.getElementById('zmazat-logo-btn').addEventListener('click', () => {
    if(confirm('Naozaj chceš odstrániť logo?')) {
        localStorage.removeItem('easycena_logo');
        vykresliNahladLoga();
    }
});

document.addEventListener('DOMContentLoaded', vykresliNahladLoga);

// ==========================================
// NAHRÁVANIE A SPRÁVA PODPISU/PEČIATKY
// ==========================================
function vykresliNahladPodpisu() {
    const podpisBase64 = localStorage.getItem('easycena_podpis');
    const box = document.getElementById('podpis-nahlad-box');
    const img = document.getElementById('podpis-preview');
    
    if (podpisBase64) {
        img.src = podpisBase64;
        box.style.display = 'flex';
    } else {
        box.style.display = 'none';
        document.getElementById('nahrat-podpis').value = '';
    }
}

document.getElementById('nahrat-podpis').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const MAX_SIRKA = 800; 
            let sirka = img.width;
            let vyska = img.height;

            if (sirka > MAX_SIRKA) {
                vyska = Math.round((vyska * MAX_SIRKA) / sirka);
                sirka = MAX_SIRKA;
            }

            canvas.width = sirka;
            canvas.height = vyska;
            ctx.drawImage(img, 0, 0, sirka, vyska);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            let minJas = 255;
            let maxJas = 0;
            for (let i = 0; i < data.length; i += 4) {
                let jas = (data[i] + data[i + 1] + data[i + 2]) / 3;
                if (jas < minJas) minJas = jas;
                if (jas > maxJas) maxJas = jas;
            }

            let rozsah = maxJas - minJas;
            let hranicaPapiera = minJas + (rozsah * 0.55); 
            let jadroAtramentu = minJas + (rozsah * 0.30); 

            for (let i = 0; i < data.length; i += 4) {
                let jas = (data[i] + data[i + 1] + data[i + 2]) / 3;
                
                if (jas > hranicaPapiera) { 
                    data[i + 3] = 0; 
                } else {
                    if (jas <= jadroAtramentu) {
                        data[i + 3] = 255; 
                    } else {
                        let pomer = (jas - jadroAtramentu) / (hranicaPapiera - jadroAtramentu);
                        data[i + 3] = Math.round(255 * (1 - pomer));
                    }
                    
                    // Odstránené drastické stmavenie. Nechávame vernú farbu (násobíme 0.95 len kvôli odlesku svetla)
                    data[i] = Math.max(0, data[i] * 0.95);
                    data[i + 1] = Math.max(0, data[i + 1] * 0.95);
                    data[i + 2] = Math.max(0, data[i + 2] * 0.95);
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            
            try {
                const vyslednyBase64 = canvas.toDataURL('image/png');
                localStorage.setItem('easycena_podpis', vyslednyBase64);
                vykresliNahladPodpisu();
                alert('Podpis bol vyrezaný s verným zachovaním pôvodnej farby.');
            } catch (error) {
                console.error("Chyba pri ukladaní do pamäte:", error);
                alert("Nastal problém pri spracovaní obrázka.");
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

document.getElementById('zmazat-podpis-btn').addEventListener('click', () => {
    if(confirm('Naozaj chceš odstrániť podpis a pečiatku z aplikácie?')) {
        localStorage.removeItem('easycena_podpis');
        vykresliNahladPodpisu();
    }
});

document.addEventListener('DOMContentLoaded', vykresliNahladPodpisu);

// ==========================================
// GENEROVANIE PDF (FINÁLNA OPRAVA FONTU A PÄTIČKY)
// ==========================================
async function vygenerujPDF(akcia) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    try {
        doc.addFileToVFS("Roboto-Regular.ttf", robotoFontBase64);
        doc.addFont("Roboto-Regular.ttf", "Roboto", "normal", "Identity-H"); 
        doc.addFileToVFS("Roboto-Bold.ttf", robotoBoldBase64);
        doc.addFont("Roboto-Bold.ttf", "Roboto", "bold", "Identity-H"); 
    } catch(e) {} 
    
    doc.setFont("Roboto", "normal");
    
    let y = 20;
    const cislo = document.getElementById('cislo-ponuky').value;
    let ulozeneLogo = localStorage.getItem('easycena_logo');
    const platcaDPH = document.getElementById('som-platca-dph').checked;
    
    // LOGO A NADPIS
    if (ulozeneLogo) {
        try {
            const imgProps = await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve({ w: img.width, h: img.height });
                img.src = ulozeneLogo;
            });

            const maxSirka = 50;
            const maxVyska = 18;
            const pomer = Math.min(maxSirka / imgProps.w, maxVyska / imgProps.h);
            const vyslednaSirka = imgProps.w * pomer;
            const vyslednaVyska = imgProps.h * pomer;

            doc.addImage(ulozeneLogo, 'PNG', 20, 10, vyslednaSirka, vyslednaVyska);
        } catch(e) { console.error("Chyba loga firmy", e); }
    }

    doc.setFont("Roboto", "bold");
    doc.setFontSize(22);
    doc.setTextColor(0, 86, 179);
    const hlavnyNadpis = window.jeRezimSupis ? 'SÚPIS PRÁC' : 'CENOVÁ PONUKA';
    doc.text(hlavnyNadpis, 190, 18, { align: "right" });
    doc.setFont("Roboto", "normal");
    
    if(cislo) { 
        doc.setFontSize(13); 
        doc.setTextColor(120, 120, 120); 
        
        // --- NOVÉ: Očistenie čísla od duplicitných slov ---
        let cisteCislo = cislo.replace(/Cenová ponuka č\.\s*/ig, '').replace(/Cenová ponuka\s*/ig, '').trim();
        
        const podnadpis = window.jeRezimSupis ? `k cenovej ponuke č. ${cisteCislo}` : cislo;
        doc.text(podnadpis, 190, 25, { align: "right" }); 
    }

    y = 40; // Základný posun

    // --- NOVÉ: VYKRESLENIE LOGA ZNAČKY VÝROBCU ---
    const znackaId = document.getElementById('ponuka-znacka') ? document.getElementById('ponuka-znacka').value : '';
    if (znackaId) {
        const ulozeneZnackyPDF = JSON.parse(localStorage.getItem('easycena_znacky')) || [];
        // Hľadáme podľa ID (pozor na konverziu typov, lebo value z roletky je string, ID v poli je number)
        const najdenaZnacka = ulozeneZnackyPDF.find(z => String(z.id) === String(znackaId));
        
        if (najdenaZnacka && najdenaZnacka.logoBase64) {
            try {
                const imgPropsZ = await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve({ w: img.width, h: img.height });
                    img.src = najdenaZnacka.logoBase64;
                });

                // Maximálne rozmery pre logo značky (trochu menšie ako hlavné logo)
                const maxSirkaZ = 35; 
                const maxVyskaZ = 12;
                const pomerZ = Math.min(maxSirkaZ / imgPropsZ.w, maxVyskaZ / imgPropsZ.h);
                const vyslednaSirkaZ = imgPropsZ.w * pomerZ;
                const vyslednaVyskaZ = imgPropsZ.h * pomerZ;

                // Zarovnanie loga doprava, pod číslo ponuky
                const poziciaX = 190 - vyslednaSirkaZ; 
                const poziciaY = 28; // Pod textom čísla (ktoré je na Y=25)

                doc.addImage(najdenaZnacka.logoBase64, 'PNG', poziciaX, poziciaY, vyslednaSirkaZ, vyslednaVyskaZ);
                y = 50; // Zväčšíme odstup pre Dodávateľa a Odberateľa, aby nenarazili do loga značky
            } catch(e) { console.error("Chyba loga znacky", e); }
        }
    }
    
    // DODÁVATEĽ A ODBERATEĽ
    doc.setFont("Roboto", "bold");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text('DODÁVATEĽ:', 20, y);
    doc.text('ODBERATEĽ:', 120, y);
    
    y += 6;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0); 
    
    doc.text(document.getElementById('moja-firma').value || 'Doplňte si profil', 20, y);
    doc.text(document.getElementById('meno-zakaznika').value || 'Zákazník', 120, y);
    
    doc.setFont("Roboto", "normal");
    y += 6;
    doc.setFontSize(10);
    doc.text(document.getElementById('moja-ulica').value, 20, y);
    doc.text(document.getElementById('ulica-zakaznika').value, 120, y);
    
    y += 6;
    doc.text(document.getElementById('moje-mesto').value, 20, y);
    doc.text(document.getElementById('mesto-zakaznika').value, 120, y);
    
    let riadokDodavatel = y + 8;
    const profil = JSON.parse(localStorage.getItem('easycena_profil')) || {};
    
    if(document.getElementById('moje-ico').value) { doc.text('IČO: ' + document.getElementById('moje-ico').value, 20, riadokDodavatel); riadokDodavatel += 6;}
    if(document.getElementById('moje-dic').value) { doc.text('DIČ: ' + document.getElementById('moje-dic').value, 20, riadokDodavatel); riadokDodavatel += 6;}
    if(platcaDPH && document.getElementById('moje-ic-dph').value) { doc.text('IČ DPH: ' + document.getElementById('moje-ic-dph').value, 20, riadokDodavatel); riadokDodavatel += 6;}
    
    if(profil.kontaktnaOsoba) { doc.text('Vybavuje: ' + profil.kontaktnaOsoba, 20, riadokDodavatel); riadokDodavatel += 6; }
    
    if(document.getElementById('moj-telefon').value) { doc.text('Tel: ' + document.getElementById('moj-telefon').value, 20, riadokDodavatel); riadokDodavatel += 6;}
    if(document.getElementById('moj-email').value) { doc.text('E-mail: ' + document.getElementById('moj-email').value, 20, riadokDodavatel); riadokDodavatel += 6;}
    
    let riadokOdberatel = y + 8;
    if(document.getElementById('ico-zakaznika').value) { doc.text('IČO: ' + document.getElementById('ico-zakaznika').value, 120, riadokOdberatel); riadokOdberatel += 6; }
    if(document.getElementById('dic-zakaznika').value) { doc.text('DIČ: ' + document.getElementById('dic-zakaznika').value, 120, riadokOdberatel); riadokOdberatel += 6; }
    if(document.getElementById('icdph-zakaznika').value) { doc.text('IČ DPH: ' + document.getElementById('icdph-zakaznika').value, 120, riadokOdberatel); riadokOdberatel += 6; }
    if(document.getElementById('telefon-zakaznika').value) { doc.text('Tel: ' + document.getElementById('telefon-zakaznika').value, 120, riadokOdberatel); riadokOdberatel += 6; }
    if(document.getElementById('email-zakaznika').value) { doc.text('E-mail: ' + document.getElementById('email-zakaznika').value, 120, riadokOdberatel); }
    
    y = Math.max(riadokDodavatel, riadokOdberatel) + 15;

    let zlavyPerc = { zariadenie: 0, material: 0, praca: 0, globalna: 0 };
    document.querySelectorAll('.zlava-riadok').forEach(r => {
        const typ = r.querySelector('.zlava-typ').value;
        const hodnota = parseFloat(r.querySelector('.zlava-hodnota').value) || 0;
        if(typ && hodnota > 0) zlavyPerc[typ] += hodnota;
    });

    let celkovaSumaDPHVsetko = 0; 
    let rekapitulaciaDphpdf = {}; 

    function vykresliBlok(nadpis, hlKategoria, zlavaKat) {
        let platneRiadky = [];
        let sumaBloku = 0;
        let dphBlokuKat = 0;
        
        document.querySelectorAll('.polozka-riadok').forEach(r => {
            const kategoria = r.dataset.kategoria || 'material';
            if (kategoria === hlKategoria) {
                const nazov = r.querySelector('.polozka-nazov').value.trim();
                const mnoz = parseFloat(r.querySelector('.polozka-mnozstvo').value) || 0;
                const mj = r.dataset.mj || 'ks';
                const cena = parseFloat(r.querySelector('.polozka-cena').value) || 0;
                const dph = parseFloat(r.dataset.dph) || 23;
                
                if(nazov && mnoz > 0) {
                    let existujuca = platneRiadky.find(p => p.nazov === nazov && p.cena === cena && p.mj === mj && p.dph === dph);
                    if (existujuca) {
                        existujuca.mnoz += mnoz;
                        existujuca.spolu += (mnoz * cena);
                    } else {
                        platneRiadky.push({nazov, mnoz, mj, cena, dph, spolu: mnoz * cena});
                    }
                    sumaBloku += (mnoz * cena);
                }
            }
        });
        
        if(platneRiadky.length === 0) return 0;
        if(y > 240) { doc.addPage(); y = 20; }
        
        doc.setFont("Roboto", "bold");
        doc.setFontSize(11);
        doc.setTextColor(0, 86, 179); 
        doc.text(nadpis.toUpperCase(), 20, y);
        
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text("Cena/MJ", 140, y, { align: "right" });
        if (platcaDPH) doc.text("% DPH", 160, y, { align: "right" });
        doc.text("Spolu", 188, y, { align: "right" });
        
        doc.setFont("Roboto", "normal");
        y += 3;
        doc.setDrawColor(0, 86, 179);
        doc.line(20, y, 190, y);
        doc.setDrawColor(0, 0, 0);
        y += 7;
        
        doc.setFontSize(10);
        platneRiadky.forEach(p => {
            if(y > 255) { doc.addPage(); y = 20; }
            doc.setTextColor(0, 0, 0);
            const splitNazov = doc.splitTextToSize(p.nazov, 80);
            doc.text(splitNazov, 20, y);
            
            doc.setTextColor(120, 120, 120);
            doc.text(`${p.mnoz} ${p.mj}`, 105, y); 
            
            doc.setTextColor(0, 0, 0);
            doc.text(`${p.cena.toFixed(2)} €`, 140, y, { align: "right" });
            
            if (platcaDPH) {
                doc.setTextColor(120, 120, 120);
                doc.text(`${p.dph}%`, 160, y, { align: "right" });
            }
            
            doc.setTextColor(0, 0, 0);
            doc.text(`${p.spolu.toFixed(2)} €`, 188, y, { align: "right" });
            
            y += (splitNazov.length * 5);
            doc.setDrawColor(230, 230, 230);
            doc.line(20, y-2, 190, y-2);
            doc.setDrawColor(0,0,0);
            y += 4;

            let poKatZlave = p.spolu * (1 - (zlavaKat / 100));
            dphBlokuKat += poKatZlave * (p.dph / 100);
            
            let poGlobalnejZlave = poKatZlave * (1 - (zlavyPerc.globalna / 100));
            celkovaSumaDPHVsetko += poGlobalnejZlave * (p.dph / 100);

            if (platcaDPH) {
                if (!rekapitulaciaDphpdf[p.dph]) rekapitulaciaDphpdf[p.dph] = { zaklad: 0, dph: 0 };
                rekapitulaciaDphpdf[p.dph].zaklad += poGlobalnejZlave;
                rekapitulaciaDphpdf[p.dph].dph += poGlobalnejZlave * (p.dph / 100);
            }
        });
        
        y += 2;
        doc.setDrawColor(0, 86, 179); 
        doc.setLineWidth(0.2); 
        doc.line(105, y-4, 190, y-4); 
        doc.setDrawColor(0, 0, 0); 

        if (zlavaKat > 0) {
            const hodnotaZlavy = sumaBloku * (zlavaKat / 100);
            doc.setTextColor(220, 38, 38);
            doc.text(`Zľava ${zlavaKat}%:`, 150, y, { align: "right" });
            doc.text(`-${hodnotaZlavy.toFixed(2)} €`, 188, y, { align: "right" });
            y += 6;
            sumaBloku -= hodnotaZlavy;
            doc.setTextColor(0, 0, 0);
        }
        
        if (platcaDPH) {
            doc.setFontSize(10);
            doc.setTextColor(120, 120, 120);
            doc.text(`Cena bez DPH:`, 150, y, { align: "right" });
            doc.text(`${sumaBloku.toFixed(2)} €`, 188, y, { align: "right" });
            y += 6;

            doc.text(`DPH:`, 150, y, { align: "right" });
            doc.text(`${dphBlokuKat.toFixed(2)} €`, 188, y, { align: "right" });
            y += 6;

            const spoluSDph = sumaBloku + dphBlokuKat;
            doc.setFontSize(11);
            doc.setFont("Roboto", "bold");
            doc.setTextColor(0, 0, 0);
            doc.text(`Spolu s DPH:`, 150, y, { align: "right" });
            doc.text(`${spoluSDph.toFixed(2)} €`, 188, y, { align: "right" });
            doc.setFont("Roboto", "normal");
        } else {
            doc.setFontSize(11);
            doc.setFont("Roboto", "bold");
            doc.setTextColor(50, 50, 50);
            doc.text(`Cena spolu:`, 150, y, { align: "right" });
            doc.text(`${sumaBloku.toFixed(2)} €`, 188, y, { align: "right" });
            doc.setFont("Roboto", "normal");
        }
        y += 15;
        
        return sumaBloku;
    }
    
    let zakladSuma = 0;
    zakladSuma += vykresliBlok('Zariadenia', 'zariadenie', zlavyPerc.zariadenie);
    zakladSuma += vykresliBlok('Inštalačný materiál', 'material', zlavyPerc.material);
    zakladSuma += vykresliBlok('Práca a Služby', 'praca', zlavyPerc.praca);
    
    if(y > 200) { doc.addPage(); y = 20; }
    
    y += 5;
    doc.setDrawColor(150, 150, 150);
    doc.line(100, y-5, 190, y-5); 
    doc.setDrawColor(0, 0, 0);
    
    if(zlavyPerc.globalna > 0) {
        const hodnotaGlo = zakladSuma * (zlavyPerc.globalna / 100);
        doc.setTextColor(220, 38, 38);
        doc.text(`Dodatočná zľava z celku (${zlavyPerc.globalna}%):`, 150, y, { align: "right" });
        doc.text(`-${hodnotaGlo.toFixed(2)} €`, 188, y, { align: "right" });
        zakladSuma -= hodnotaGlo;
        doc.setTextColor(0, 0, 0);
        y += 8;
    }
    
    if (platcaDPH) {
        doc.setTextColor(100, 100, 100);
        doc.text('Celkom bez DPH:', 150, y, { align: "right" });
        doc.text(zakladSuma.toFixed(2) + ' €', 188, y, { align: "right" });
        y += 6;
        
        Object.keys(rekapitulaciaDphpdf).sort((a,b) => b - a).forEach(sadzba => {
            if (rekapitulaciaDphpdf[sadzba].zaklad > 0) {
                doc.setFontSize(9);
                doc.text(`Základ (${sadzba}%): ${rekapitulaciaDphpdf[sadzba].zaklad.toFixed(2)} €`, 150, y, { align: "right" });
                doc.text(`DPH: ${rekapitulaciaDphpdf[sadzba].dph.toFixed(2)} €`, 188, y, { align: "right" });
                y += 5;
            }
        });
        
        doc.setFontSize(10);
        doc.text('Celková DPH:', 150, y, { align: "right" });
        doc.text(celkovaSumaDPHVsetko.toFixed(2) + ' €', 188, y, { align: "right" });
        y += 8;
        zakladSuma += celkovaSumaDPHVsetko;
        
        doc.setDrawColor(200, 200, 200);
        doc.line(120, y-4, 190, y-4); 
        doc.setDrawColor(0, 0, 0);
        y += 8;
    }
    
    doc.setFont("Roboto", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    // Posunuté dostatočne doľava, aby sa "KONEČNÁ SUMA:" a suma nikdy nezrazili
    doc.text('KONEČNÁ SUMA:', 140, y, { align: "right" }); 
    doc.setTextColor(0, 86, 179);
    doc.text(zakladSuma.toFixed(2) + ' €', 188, y, { align: "right" });
    doc.setFont("Roboto", "normal");
    
    y += 20; 

    // --- TECHNICKÝ POPIS ZARIADENÍ ---
    if (!window.jeRezimSupis) {
    let technickePopisy = [];
    const aktualnyKatalog = JSON.parse(localStorage.getItem('easycena_katalog')) || [];

    document.querySelectorAll('.polozka-riadok').forEach(r => {
        const kateg = r.dataset.kategoria ? r.dataset.kategoria.toLowerCase().trim() : '';
        
        if (kateg === 'zariadenie') {
            const nazov = r.querySelector('.polozka-nazov').value.trim();
            
            const popisArea = r.querySelector('.polozka-popis');
            let textPopisu = popisArea ? popisArea.value.trim() : '';
            
            // Vytiahneme základný text z katalógu pre porovnanie
            const najdene = aktualnyKatalog.find(p => p.typ === 'polozka' && p.nazov.trim().toLowerCase() === nazov.toLowerCase());
            const defaultPopis = (najdene && najdene.popis) ? najdene.popis.trim() : '';

            // Ak je text na ploche prázdny, natiahneme ten z katalógu
            if (textPopisu === '') {
                textPopisu = defaultPopis;
            }

            if (textPopisu !== '') {
                const existujuci = technickePopisy.find(t => t.nazov === nazov);
                if (!existujuci) {
                    // Ak zariadenie ešte nemáme v zozname, jednoducho ho pridáme
                    technickePopisy.push({ nazov: nazov, text: textPopisu });
                } else {
                    // Ak už zariadenie v zozname je (napr. z balíka), porovnáme texty.
                    // Ak používateľ tento text manuálne upravil, upravený text vyhráva a nahradí ten pôvodný!
                    if (textPopisu !== defaultPopis && textPopisu !== existujuci.text) {
                        existujuci.text = textPopisu;
                    }
                }
            }
        }
    });

    if (technickePopisy.length > 0) {
        doc.addPage(); 
        y = 20;
        
        doc.setFont("Roboto", "bold");
        doc.setFontSize(16);
        doc.setTextColor(0, 86, 179); 
        doc.text('TECHNICKÝ POPIS ZARIADENÍ', 20, y);
        y += 12;

        technickePopisy.forEach(pol => {
            doc.setFont("Roboto", "bold");
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.text(pol.nazov, 20, y);
            y += 6;

            doc.setFont("Roboto", "normal");
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80); 
            
            const textyRiadky = pol.text.split('\n');
            textyRiadky.forEach(riadok => {
                const splitPopis = doc.splitTextToSize(riadok, 170);
                
                if (y + (splitPopis.length * 5) > 270) {
                    doc.addPage();
                    y = 20;
                }
                
                doc.text(splitPopis, 20, y);
                y += (splitPopis.length * 5) + 2; 
            });
            y += 8; 
        });
    }
    
    // --- POZNÁMKA 1 (Doplňujúci text pred podmienkami) ---
    const poznamka1 = document.getElementById('ponuka-poznamka-1') ? document.getElementById('ponuka-poznamka-1').value.trim() : '';
    if (poznamka1) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);
        const splitPoznamka = doc.splitTextToSize(poznamka1, 170);
        doc.text(splitPoznamka, 20, y);
        y += (splitPoznamka.length * 5) + 5;
    }

    // --- OBCHODNÉ PODMIENKY A PLATNOSŤ ---
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    
    const dodacie = document.getElementById('ponuka-dodacie') ? document.getElementById('ponuka-dodacie').value : '';
    const platobne = document.getElementById('ponuka-platobne') ? document.getElementById('ponuka-platobne').value : '';
    const zarukaZar = document.getElementById('ponuka-zaruka-zariadenie') ? document.getElementById('ponuka-zaruka-zariadenie').value : '';
    const zarukaMon = document.getElementById('ponuka-zaruka-montaz') ? document.getElementById('ponuka-zaruka-montaz').value : '';
    
    let datumPlatnostiText = "";
    const zadanyDatumPlatnosti = document.getElementById('platnost-do') ? document.getElementById('platnost-do').value : '';
    if (zadanyDatumPlatnosti) {
        datumPlatnostiText = new Date(zadanyDatumPlatnosti).toLocaleDateString('sk-SK');
    } else {
        const platnost = new Date(); 
        platnost.setDate(platnost.getDate() + 30);
        datumPlatnostiText = platnost.toLocaleDateString('sk-SK');
    }

    // Posunuté hodnoty na X=70 (miesto 60) pre vzdušnejší vzhľad a istotu voči "Platnosť ponuky do"
    doc.setFont("Roboto", "bold");
    if(dodacie) { doc.text('Dodacie podmienky:', 20, y); doc.setFont("Roboto", "normal"); doc.setTextColor(0,0,0); doc.text(dodacie, 70, y); doc.setTextColor(100,100,100); doc.setFont("Roboto", "bold"); y += 5; }
    if(platobne) { doc.text('Platobné podmienky:', 20, y); doc.setFont("Roboto", "normal"); doc.setTextColor(0,0,0); doc.text(platobne, 70, y); doc.setTextColor(100,100,100); doc.setFont("Roboto", "bold"); y += 5; }
    doc.text('Platnosť ponuky do:', 20, y); doc.setFont("Roboto", "normal"); doc.setTextColor(0,0,0); doc.text(datumPlatnostiText, 70, y); doc.setTextColor(100,100,100); doc.setFont("Roboto", "bold"); y += 5;
    if(zarukaZar) { doc.text('Záruka (Zariadenie):', 20, y); doc.setFont("Roboto", "normal"); doc.setTextColor(0,0,0); doc.text(zarukaZar, 70, y); doc.setTextColor(100,100,100); doc.setFont("Roboto", "bold"); y += 5; }
    if(zarukaMon) { doc.text('Záruka (Montáž):', 20, y); doc.setFont("Roboto", "normal"); doc.setTextColor(0,0,0); doc.text(zarukaMon, 70, y); doc.setTextColor(100,100,100); doc.setFont("Roboto", "bold"); y += 10; }
    doc.setFont("Roboto", "normal");

    // --- INFORMÁCIA 2 (Pred podpisom) ---
    const info2 = document.getElementById('ponuka-informacia-2') ? document.getElementById('ponuka-informacia-2').value.trim() : '';
    if (info2) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        const splitInfo = doc.splitTextToSize(info2, 170);
        doc.text(splitInfo, 20, y);
        y += (splitInfo.length * 5) + 10;
    }
    }
    // --- DÁTUM VYSTAVENIA, PEČIATKA A PODPIS ---
    if (y > 230) { doc.addPage(); y = 20; }
    
    // Načítanie miesta a dátumu
    const miestoVystavenia = document.getElementById('ponuka-miesto-vystavenia') ? document.getElementById('ponuka-miesto-vystavenia').value.trim() : '';
    const zadanyDatumVystavenia = document.getElementById('ponuka-datum-vystavenia') ? document.getElementById('ponuka-datum-vystavenia').value : '';
    
    // Ak je to Súpis prác, vždy pretlačíme dnešný dátum
    const datumVystaveniaText = window.jeRezimSupis 
        ? new Date().toLocaleDateString('sk-SK') 
        : (zadanyDatumVystavenia ? new Date(zadanyDatumVystavenia).toLocaleDateString('sk-SK') : new Date().toLocaleDateString('sk-SK'));
        
    const textMiestoDatum = `V ${miestoVystavenia ? miestoVystavenia : '..........'}, dňa ${datumVystaveniaText}`;

    // Vykreslenie dátumu naľavo
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(textMiestoDatum, 20, y + 20);

    // Vykreslenie pečiatky napravo
    let ulozenyPodpis = localStorage.getItem('easycena_podpis');
    let textPodpisuPdf = profil.textPodpisu !== undefined && profil.textPodpisu !== '' ? profil.textPodpisu : 'Pečiatka a podpis dodávateľa';

    if (window.jeRezimSupis) {
        // Pre Súpis prác schováme obrázok a dáme priestor pre obe strany
        doc.setDrawColor(150, 150, 150);
        doc.line(115, y + 15, 150, y + 15); // Čiara Odovzdal
        doc.line(160, y + 15, 195, y + 15); // Čiara Prevzal
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('Odovzdal (Dodávateľ)', 132.5, y + 20, {align: "center"});
        doc.text('Prevzal (Odberateľ)', 177.5, y + 20, {align: "center"});
    } else {
        // Štandardná logika pre Cenovú ponuku
        if (ulozenyPodpis) {
            try {
                const imgPropsP = await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve({ w: img.width, h: img.height });
                    img.src = ulozenyPodpis;
                });

                const maxSirkaP = 50; 
                const maxVyskaP = 20;
                const pomerP = Math.min(maxSirkaP / imgPropsP.w, maxVyskaP / imgPropsP.h);
                const vyslednaSirkaP = imgPropsP.w * pomerP;
                const vyslednaVyskaP = imgPropsP.h * pomerP;

                const poziciaX = 165 - (vyslednaSirkaP / 2);
                const poziciaY = (y + 15) - vyslednaVyskaP;

                doc.addImage(ulozenyPodpis, 'PNG', poziciaX, poziciaY, vyslednaSirkaP, vyslednaVyskaP);
            } catch(e) { console.error("Chyba podpisu", e); }
        } else {
            doc.setDrawColor(150, 150, 150);
            doc.line(140, y + 15, 190, y + 15);
        }
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(textPodpisuPdf, 165, y + 20, {align: "center"});
    }
    
    // --- PÄTIČKA (NA KAŽDÚ STRANU) ---
    const firma = document.getElementById('moja-firma').value || '';
    const ulica = document.getElementById('moja-ulica').value || '';
    const mesto = document.getElementById('moje-mesto').value || '';
    const register = document.getElementById('profil-zapis-register') ? document.getElementById('profil-zapis-register').value.trim() : '';
    
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 275, 190, 275);
        
        doc.setFontSize(10);
        doc.setFont("Roboto", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text(`${firma}, ${ulica}, ${mesto}`, 105, 282, {align: 'center'});
        doc.setFont("Roboto", "normal");
        
        if (register) {
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            
            // PÄTIČKA: Zalamovanie a správne centrovanie každého riadku zvlášť
            const splitRegister = doc.splitTextToSize(register, 170); 
            let regY = 287;
            splitRegister.forEach(line => {
                doc.text(line, 105, regY, {align: 'center'});
                regY += 3.5;
            });
        }
    }

    let prefix = window.jeRezimSupis ? 'Supis_prac' : 'Ponuka';
    const nazovSuboru = cislo ? `${prefix}_${cislo}.pdf` : `${prefix}.pdf`;
    
    if (akcia === 'stiahnut') {
        doc.save(nazovSuboru);
    } else if (akcia === 'zdielat') {
        const pdfBlob = doc.output('blob');
        const subor = new File([pdfBlob], nazovSuboru, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [subor] })) {
            navigator.share({ files: [subor], title: 'Cenová ponuka' }).catch(console.error);
        } else {
            alert('Zdieľanie nie je podporované. Súbor sa stiahne.');
            doc.save(nazovSuboru);
        }
    }
}

document.getElementById('btn-stiahnut-pdf').addEventListener('click', () => vygenerujPDF('stiahnut'));
document.getElementById('btn-zdielat-pdf').addEventListener('click', () => vygenerujPDF('zdielat'));

// ==========================================
// ZÁLOHA A OBNOVA DÁT
// ==========================================

function vytvorDataZalohy() {
    // Naskladáme celú pamäť do jedného objektu
    const meta = (typeof _nacitajMeta === 'function') ? _nacitajMeta() : { modifiedAt: {} };
    const deviceLabel = (typeof nacitajDeviceLabel === 'function') ? nacitajDeviceLabel() : '';

    const zaloha = {
        katalog: localStorage.getItem('easycena_katalog') ? JSON.parse(localStorage.getItem('easycena_katalog')) : [],
        archiv: localStorage.getItem('easycena_archiv') ? JSON.parse(localStorage.getItem('easycena_archiv')) : [],
        profil: localStorage.getItem('easycena_profil') ? JSON.parse(localStorage.getItem('easycena_profil')) : null,
        logo: localStorage.getItem('easycena_logo') || null,

        // Tieto kľúče si tu rovno pripravíme pre Krok 2 a 3, aby sme tento kód už nemuseli neskôr prepisovať
        podpis: localStorage.getItem('easycena_podpis') || null,
        pocitadlo: localStorage.getItem('easycena_pocitadlo') || 1,
        nastavenia: localStorage.getItem('easycena_nastavenia') ? JSON.parse(localStorage.getItem('easycena_nastavenia')) : null,

        // _meta pre 3-way merge sync model — pridané v Commit 3.1
        _meta: {
            modifiedAt: meta.modifiedAt || {},
            deviceLabel: deviceLabel,
            exportedAt: Date.now(),
            schemaVersion: 1
        }
    };

    // Skonvertujeme to na text, ktorý sa uloží do .json súboru
    return JSON.stringify(zaloha);
}

function inteligentnaZaloha() {
    const textDat = vytvorDataZalohy();
    const subor = new File([textDat], 'easycena_zaloha.json', { type: 'application/json' });

    // Vytvoríme si pomocnú funkciu na stiahnutie, aby sme nepísali ten istý kód dvakrát
    const stiahniZalohuFallback = () => {
        const blob = new Blob([textDat], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const datum = new Date().toLocaleDateString('sk-SK').replace(/\s/g, '');
        a.download = `easycena_zaloha_${datum}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // 1. Otestujeme, či zariadenie vôbec tvrdí, že podporuje zdieľanie
    if (navigator.canShare && navigator.canShare({ files: [subor] })) {
        navigator.share({
            files: [subor],
            title: 'Záloha EasyCena',
            text: 'Kompletná záloha dát z aplikácie EasyCena'
        }).catch(error => {
            console.log('Zdieľanie zablokované systémom, prepínam na sťahovanie...', error);
            // 2. Ak systém (napr. Windows) zdieľanie na poslednú chvíľu zablokuje, stiahneme súbor
            stiahniZalohuFallback();
        });
    } else {
        // 3. Ak prehliadač rovno povie, že zdieľanie nepodporuje, stiahneme súbor
        stiahniZalohuFallback();
    }
}

// Aplikuje obsah zálohy do localStorage. Volaná z lokálnej obnovy aj z Drive obnovy.
// NEROBÍ confirm/alert/reload — to si rieši volajúci.
function _aplikujZalohu(data) {
    if (data.katalog) {
        katalog = data.katalog;
        localStorage.setItem('easycena_katalog', JSON.stringify(data.katalog));
    }
    if (data.archiv) {
        archiv = data.archiv;
        localStorage.setItem('easycena_archiv', JSON.stringify(data.archiv));
    }
    if (data.profil) localStorage.setItem('easycena_profil', JSON.stringify(data.profil));

    // Logo a Podpis (bez stringify, lebo to je čistý text)
    if (data.logo) localStorage.setItem('easycena_logo', data.logo);
    if (data.podpis) localStorage.setItem('easycena_podpis', data.podpis);

    // Ostatné dáta
    if (data.pocitadlo) localStorage.setItem('easycena_pocitadlo', data.pocitadlo);
    if (data.nastavenia) localStorage.setItem('easycena_nastavenia', JSON.stringify(data.nastavenia));

    // Sync meta — ak záloha obsahuje _meta, prevezmeme jej timestampy
    // (aby sme po obnove vedeli, "kedy bola táto verzia naposledy zmenená")
    if (data._meta && data._meta.modifiedAt) {
        localStorage.setItem('easycena_meta', JSON.stringify({
            modifiedAt: data._meta.modifiedAt
        }));
    }
}

function obnovitZalohu(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            if (confirm('Naozaj chceš prepísať aktuálne dáta zálohou? Táto akcia sa nedá vrátiť.')) {
                _aplikujZalohu(data);
                alert('Dáta boli úspešne obnovené zo zálohy. Aplikácia sa teraz reštartuje.');
                location.reload(); // Reštart pre načítanie profilu a lôg
            }
        } catch (error) {
            console.error('Chyba pri čítaní zálohy:', error);
            alert('Chyba pri čítaní súboru. Uisti sa, že nahrávaš správny záložný súbor.');
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset inputu
}
// Theme switching logic
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme');

    if (currentTheme === 'light') {
        document.body.setAttribute('data-theme', 'light');
        themeToggle.checked = true;
    }
    // Sync ikony quick toggle podľa skutočného stavu (po načítaní DOM)
    if (typeof aktualizujThemeIkonu === 'function') aktualizujThemeIkonu();

    themeToggle.addEventListener('change', function() {
        if (this.checked) {
            document.body.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.removeAttribute('data-theme');
            localStorage.removeItem('theme');
        }
        // Pri zmene v Nastaveniach tiež aktualizuj ikonu hero quick toggle
        if (typeof aktualizujThemeIkonu === 'function') aktualizujThemeIkonu();
    });
});

// ==========================================
// IMPORT KATALÓGU (CSV)
// ==========================================
let docasneCSVData = [];

document.getElementById('import-csv-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const text = event.target.result;
        // Rozdelíme na riadky (pre Windows \r\n aj Mac \n)
        const riadky = text.split(/\r?\n/).filter(r => r.trim() !== '');
        if (riadky.length < 2) {
            alert('Súbor je prázdny alebo neobsahuje hlavičky a dáta.');
            e.target.value = '';
            return;
        }

        // Automatická detekcia oddelovača (čiarka vs bodkočiarka)
        const oddelovac = riadky[0].includes(';') ? ';' : ',';
        const hlavicky = riadky[0].split(oddelovac).map(h => h.trim().replace(/^"|"$/g, ''));
        
        docasneCSVData = riadky.slice(1).map(riadok => {
            return riadok.split(oddelovac).map(bunka => bunka.trim().replace(/^"|"$/g, ''));
        });

        // Naplnenie roletiek na párovanie
        const selects = ['map-nazov', 'map-cena', 'map-dph', 'map-kategoria', 'map-mj'];
        selects.forEach(id => {
            const select = document.getElementById(id);
            while (select.options.length > 1) select.remove(1); // vymaže staré okrem prvej možnosti
            
            hlavicky.forEach((hlavicka, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.text = hlavicka || `Stĺpec ${index + 1}`;
                select.appendChild(option);
            });
        });

        document.getElementById('import-mapovanie-box').style.display = 'block';
    };
    reader.readAsText(file, 'windows-1250'); // Podpora pre slovenský Excel
});

document.getElementById('spustit-import-btn').addEventListener('click', () => {
    const idxNazov = document.getElementById('map-nazov').value;
    const idxCena = document.getElementById('map-cena').value;
    const idxDph = document.getElementById('map-dph').value;
    const idxKat = document.getElementById('map-kategoria').value;
    const idxMj = document.getElementById('map-mj').value;

    if (idxNazov === "" || idxCena === "") {
        alert('Názov položky a Cena bez DPH sú povinné polia. Prosím priraď ich.');
        return;
    }

    const profil = JSON.parse(localStorage.getItem('easycena_profil')) || {};
    const defaultDPH = profil.sadzbaDph || '23';
    let importovanych = 0;
    let sChybou = 0;

    docasneCSVData.forEach(riadok => {
        // Ak chýba názov, preskočíme (prázdne riadky)
        if (!riadok[idxNazov] || riadok[idxNazov].trim() === '') return; 

        let nazov = riadok[idxNazov];
        
        // Ak bunka s cenou úplne chýba alebo je prázdna, podstrčíme text 'NaN', 
        // aby to naša validácia nižšie zachytila a hodila na položku výkričník.
        let textCeny = (riadok[idxCena] !== undefined && riadok[idxCena].trim() !== '') ? riadok[idxCena] : 'NaN';
        let cenaRaw = parseFloat(textCeny.replace(/\s/g, '').replace(',', '.')); 
        let dphRaw = idxDph !== "" && riadok[idxDph] ? parseFloat(riadok[idxDph].replace(',', '.')) : parseFloat(defaultDPH);
        
        let kategoria = idxKat !== "" && riadok[idxKat] ? riadok[idxKat].toLowerCase() : 'material';
        if (!['zariadenie', 'material', 'praca'].includes(kategoria)) kategoria = 'material';
        
        let mj = idxMj !== "" && riadok[idxMj] ? riadok[idxMj] : 'ks';

        let vyzadujeKontrolu = false;

        // Kontrola, či importované dáta nie sú blbosti
        if (isNaN(cenaRaw) || cenaRaw < 0) {
            cenaRaw = 0;
            vyzadujeKontrolu = true;
        }
        if (isNaN(dphRaw) || dphRaw < 0 || dphRaw > 100) {
            dphRaw = defaultDPH;
            vyzadujeKontrolu = true;
        }

        katalog.push({
            typ: 'polozka',
            kategoria: kategoria,
            nazov: nazov,
            mj: mj,
            cena: cenaRaw,
            dph: dphRaw,
            vyzadujeKontrolu: vyzadujeKontrolu
        });

        importovanych++;
        if (vyzadujeKontrolu) sChybou++;
    });

    localStorage.setItem('easycena_katalog', JSON.stringify(katalog));
    if (typeof oznacZmeneny === 'function') oznacZmeneny('katalog');
    vykresliKatalog();
    
    document.getElementById('import-mapovanie-box').style.display = 'none';
    document.getElementById('import-csv-input').value = '';
    docasneCSVData = [];

    if (sChybou > 0) {
        alert(`Import prebehol.\nUložených položiek: ${importovanych}\n⚠️ Pozor, ${sChybou} položiek vyžaduje doplnenie ceny alebo DPH a sú v katalógu označené červenou farbou.`);
    } else {
        alert(`Import úspešný.\nPridaných ${importovanych} nových položiek.`);
    }
});

// ==========================================
// SPRÁVA LÔG ZNAČIEK (VÝROBCOVIA)
// ==========================================
let ulozeneZnacky = JSON.parse(localStorage.getItem('easycena_znacky')) || [];

function vykresliZoznamZnaciek() {
    const kontajner = document.getElementById('zoznam-znaciek');
    if (!kontajner) return;
    kontajner.innerHTML = '';
    
    // ZORADENIE PODĽA ABECEDY
    const zoradeneZnacky = [...ulozeneZnacky].sort((a, b) => a.nazov.localeCompare(b.nazov, 'sk'));
    
    zoradeneZnacky.forEach(znacka => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';
        div.style.padding = '8px';
        div.style.border = '1px solid var(--border-color, #4b5563)';
        div.style.borderRadius = '4px';
        div.style.backgroundColor = 'var(--input-bg-color, #2d2d2d)';
        
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="width: 60px; height: 30px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 3px; padding: 2px;">
                    <img src="${znacka.logoBase64}" style="max-height: 100%; max-width: 100%; object-fit: contain;">
                </div>
                <strong style="color: var(--text-color, #ffffff); font-size: 14px;">${znacka.nazov}</strong>
            </div>
            <button type="button" class="btn-danger btn-small" onclick="zmazatZnacku(${znacka.id})" style="padding: 4px 8px;">Zmazať</button>
        `;
        kontajner.appendChild(div);
    });

    // Po každom prekreslení zoznamu aktualizujeme aj roletku na pracovnej ploche
    aktualizujRoletkuZnaciek(zoradeneZnacky);
}

// NOVÁ FUNKCIA: Naplní roletku na pracovnej ploche
function aktualizujRoletkuZnaciek(zoradeneZnacky) {
    const select = document.getElementById('ponuka-znacka');
    if (!select) return;

    const aktualnaHodnota = select.value; // Zapamätáme si výber
    select.innerHTML = '<option value="">-- Bez loga značky --</option>';

    zoradeneZnacky.forEach(znacka => {
        const option = document.createElement('option');
        option.value = znacka.id;
        option.text = znacka.nazov;
        select.appendChild(option);
    });

    if (aktualnaHodnota) select.value = aktualnaHodnota;
}

document.getElementById('pridat-znacku-btn').addEventListener('click', function() {
    const nazovInput = document.getElementById('nova-znacka-nazov');
    const fileInput = document.getElementById('nova-znacka-logo');
    const nazov = nazovInput.value.trim();
    const file = fileInput.files[0];
    
    if (!nazov) {
        alert('Zadaj názov značky (napr. MDV).');
        return;
    }
    if (!file) {
        alert('Vyber obrázok loga pre túto značku.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            // Bezpečné zmenšenie loga na max 400px šírku pre ochranu pamäte
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const MAX_SIRKA = 400; 
            let sirka = img.width;
            let vyska = img.height;

            if (sirka > MAX_SIRKA) {
                vyska = Math.round((vyska * MAX_SIRKA) / sirka);
                sirka = MAX_SIRKA;
            }

            canvas.width = sirka;
            canvas.height = vyska;
            ctx.drawImage(img, 0, 0, sirka, vyska);
            
            try {
                const vyslednyBase64 = canvas.toDataURL('image/png');
                
                const novaZnacka = {
                    id: Date.now(),
                    nazov: nazov,
                    logoBase64: vyslednyBase64
                };
                
                ulozeneZnacky.push(novaZnacka);
                localStorage.setItem('easycena_znacky', JSON.stringify(ulozeneZnacky));
                
                vykresliZoznamZnaciek();
                
                // Vyčistenie políčok po úspešnom pridaní
                nazovInput.value = '';
                fileInput.value = '';
                
            } catch (error) {
                console.error("Chyba pri ukladaní:", error);
                alert("Obrázok je príliš veľký alebo poškodený.");
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Funkcia dostupná globálne pre inline tlačidlo "Zmazať"
window.zmazatZnacku = function(id) {
    if(confirm('Naozaj chceš zmazať túto značku?')) {
        ulozeneZnacky = ulozeneZnacky.filter(z => z.id !== id);
        localStorage.setItem('easycena_znacky', JSON.stringify(ulozeneZnacky));
        vykresliZoznamZnaciek();
    }
};

// =====================================================
// CLOUD ZÁLOHA — GOOGLE DRIVE INTEGRÁCIA
// =====================================================
const GOOGLE_CLIENT_ID = '126578330770-s4tv3cr1hmdlb2g3htv182uvmnkloo0k.apps.googleusercontent.com';
// Scope: drive.file = prístup len k súborom ktoré appka sama vytvorí
//        email      = email adresa pre zobrazenie "Prihlásený ako: x@y.com"
//        profile    = (voliteľné) meno, avatar — momentálne nepoužité
const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file email profile';

let driveTokenClient = null;
let driveAccessToken = null;
let driveUserEmail = null;

// Spustí sa po načítaní DOM. Google SDK (gsi/client) sa loaduje async,
// preto čakáme kým bude `google.accounts.oauth2` dostupné.
document.addEventListener('DOMContentLoaded', () => {
    // Pred SDK init vieme načítať uložený token a UI nastaviť
    nacitajUlozenyDriveToken();
    aktualizujDriveUI();

    // Pripojíme handlere na tlačidlá (existujú aj pred SDK init)
    const loginBtn = document.getElementById('drive-login-btn');
    const logoutBtn = document.getElementById('drive-logout-btn');
    const backupBtn = document.getElementById('drive-backup-btn');
    const restoreBtn = document.getElementById('drive-restore-btn');
    if (loginBtn) loginBtn.addEventListener('click', driveLogin);
    if (logoutBtn) logoutBtn.addEventListener('click', driveLogout);
    if (backupBtn) backupBtn.addEventListener('click', driveZalohuj);
    if (restoreBtn) restoreBtn.addEventListener('click', driveZobrazZoznamZaloh);

    // Polling kým sa Google SDK načíta
    function tryInitGoogleSdk() {
        if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
            setTimeout(tryInitGoogleSdk, 200);
            return;
        }
        driveTokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: GOOGLE_DRIVE_SCOPE,
            callback: handleDriveAuthResponse
        });
        // Po init SDK: ak je platný token → pull-on-open. Ak nie je ale email
        // je uložený → upozorni užívateľa, nech sa prihlási. Automatický
        // silent re-auth pri starte sa nedá — prehliadač blokuje popup,
        // ktorý Google fallback-uje cez prompt:'none' (popup blocker pre
        // skripty bez user gesture). Riešenie ide cez manuálny klik.
        if (driveAccessToken) {
            if (typeof _skusPullOnOpen === 'function') _skusPullOnOpen();
        } else if (localStorage.getItem('easycena_drive_email')) {
            // Token expiroval, ale kedysi bol prihlásený
            if (typeof ukazToast === 'function') {
                ukazToast('🔒 Drive prihlásenie vypršalo — klikni "Prihlásiť sa" v Nastaveniach', 'info', 6000);
            }
        }
    }
    tryInitGoogleSdk();
});

// Spracovanie odpovede z Google OAuth popup-u
function handleDriveAuthResponse(response) {
    if (response.error) {
        console.error('Drive auth error:', response);
        alert('Prihlásenie do Google Drive zlyhalo:\n' + (response.error_description || response.error));
        return;
    }
    driveAccessToken = response.access_token;
    const expiresAt = Date.now() + ((response.expires_in || 3600) * 1000);
    localStorage.setItem('easycena_drive_token', JSON.stringify({
        token: driveAccessToken,
        expiresAt: expiresAt
    }));
    // Načítame email cez userinfo endpoint
    fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: 'Bearer ' + driveAccessToken }
    })
    .then(r => r.json())
    .then(info => {
        driveUserEmail = info.email || null;
        if (driveUserEmail) {
            localStorage.setItem('easycena_drive_email', driveUserEmail);
        }
        aktualizujDriveUI();
        // Po prihlásení skús pull-on-open (ak ešte nebol)
        if (typeof _skusPullOnOpen === 'function') _skusPullOnOpen();
    })
    .catch(err => {
        console.warn('Drive userinfo fetch failed:', err);
        aktualizujDriveUI();
        if (typeof _skusPullOnOpen === 'function') _skusPullOnOpen();
    });
}

// Tlačidlo "Prihlásiť sa do Google Drive"
function driveLogin() {
    if (!driveTokenClient) {
        alert('Google SDK sa ešte nenačítalo. Skús znovu o pár sekúnd.');
        return;
    }
    // prompt:'consent' zaručí explicitný consent screen pri prvom prihlásení;
    // pri ďalších prihláseniach Google ho preskočí, ak povolenie ešte platí.
    driveTokenClient.requestAccessToken({ prompt: '' });
}

// Tlačidlo "Odhlásiť sa"
function driveLogout() {
    if (!confirm('Naozaj sa odhlásiť z Google Drive? Cloud zálohy budú deaktivované, kým sa znova neprihlásiš.')) return;
    if (driveAccessToken && typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
        google.accounts.oauth2.revoke(driveAccessToken, () => { /* tichý revoke */ });
    }
    driveAccessToken = null;
    driveUserEmail = null;
    localStorage.removeItem('easycena_drive_token');
    localStorage.removeItem('easycena_drive_email');
    aktualizujDriveUI();
}

// Načíta uložený token z localStorage (ak je platný)
function nacitajUlozenyDriveToken() {
    try {
        const stored = JSON.parse(localStorage.getItem('easycena_drive_token') || 'null');
        if (stored && stored.expiresAt > Date.now()) {
            driveAccessToken = stored.token;
            driveUserEmail = localStorage.getItem('easycena_drive_email') || null;
        } else if (stored) {
            // Token expiroval — vyčistíme
            localStorage.removeItem('easycena_drive_token');
            localStorage.removeItem('easycena_drive_email');
        }
    } catch (e) {
        console.warn('Drive token load failed:', e);
    }
}

// Aktualizuje UI v Nastaveniach podľa aktuálneho stavu prihlásenia
function aktualizujDriveUI() {
    const notLoggedIn = document.getElementById('drive-not-logged-in');
    const loggedIn   = document.getElementById('drive-logged-in');
    const emailSpan  = document.getElementById('drive-user-email');
    const accSub     = document.getElementById('drive-acc-sub');
    if (!notLoggedIn || !loggedIn) return;

    if (driveAccessToken) {
        notLoggedIn.style.display = 'none';
        loggedIn.style.display = 'block';
        if (emailSpan) emailSpan.textContent = driveUserEmail || '(prihlásený)';
        if (accSub) {
            accSub.textContent = driveUserEmail
                ? '✅ Prihlásený · ' + driveUserEmail
                : '✅ Prihlásený do Google Drive';
        }
        aktualizujDriveZalohaStatus();
    } else {
        notLoggedIn.style.display = 'block';
        loggedIn.style.display = 'none';
        if (accSub) accSub.textContent = 'Prihlás sa pre automatickú zálohu dát';
    }
}

// =====================================================
// CLOUD ZÁLOHA — UPLOAD JSON DO DRIVE PRIEČINKA
// =====================================================
const DRIVE_FOLDER_NAME = 'EasyCena_zalohy';
const DRIVE_API_BASE    = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

// Hlavný handler tlačidla "Zálohovať teraz"
async function driveZalohuj() {
    if (!driveAccessToken) {
        alert('Nie si prihlásený do Google Drive.');
        return;
    }
    const btn = document.getElementById('drive-backup-btn');
    const statusEl = document.getElementById('drive-backup-status');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Zálohujem…'; }
    if (statusEl) statusEl.textContent = 'Prebieha upload do Google Drive…';

    try {
        // 1. Nájdi alebo vytvor priečinok EasyCena_zalohy
        const folderId = await _driveZistiPriecinokId();

        // 2. Priprav JSON dáta z localStorage (existujúca funkcia)
        const dataJson = vytvorDataZalohy();

        // 3. Vytvor názov súboru s timestampom: easycena_zaloha_2026-04-28_20-42.json
        const ts = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const filename = `easycena_zaloha_${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())}_${pad(ts.getHours())}-${pad(ts.getMinutes())}.json`;

        // 4. Upload
        await _driveUploadJsonSubor(folderId, filename, dataJson);

        // 5. Ulož timestamp poslednej zálohy
        const teraz = Date.now();
        localStorage.setItem('easycena_drive_last_backup', String(teraz));

        if (btn) { btn.disabled = false; btn.textContent = '📤 Zálohovať teraz'; }
        aktualizujDriveZalohaStatus();
        if (statusEl) statusEl.textContent = '✅ Zálohované práve teraz';
        if (typeof ukazToast === 'function') ukazToast('☁️ Zálohované do Google Drive', 'success');
    } catch (err) {
        console.error('Drive zaloha failed:', err);
        if (btn) { btn.disabled = false; btn.textContent = '📤 Zálohovať teraz'; }
        if (statusEl) statusEl.textContent = '❌ Chyba: ' + (err.message || 'záloha zlyhala');
        // Pri 401 (token expiroval) ponúkneme znovuprihlásenie
        if (err && err.status === 401) {
            if (confirm('Prihlásenie do Google Drive vypršalo. Chceš sa znova prihlásiť?')) {
                driveLogin();
            }
        }
    }
}

// Aktualizuje status text pod tlačidlom "Zálohovať teraz" — "Posledná záloha: pred X min"
function aktualizujDriveZalohaStatus() {
    const statusEl = document.getElementById('drive-backup-status');
    if (!statusEl) return;
    const lastRaw = localStorage.getItem('easycena_drive_last_backup');
    if (!lastRaw) {
        statusEl.textContent = 'Posledná záloha: nikdy';
        return;
    }
    const last = parseInt(lastRaw, 10);
    if (isNaN(last)) {
        statusEl.textContent = 'Posledná záloha: neznáma';
        return;
    }
    const diff = Math.round((Date.now() - last) / 1000);
    let text;
    if (diff < 60)        text = `Posledná záloha: práve teraz`;
    else if (diff < 3600) text = `Posledná záloha: pred ${Math.round(diff / 60)} min`;
    else if (diff < 86400) text = `Posledná záloha: pred ${Math.round(diff / 3600)} h`;
    else {
        const dt = new Date(last);
        const pad = (n) => String(n).padStart(2, '0');
        text = `Posledná záloha: ${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}.${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    }
    statusEl.textContent = text;
}

// Nájde priečinok "EasyCena_zalohy" alebo ho vytvorí. Vráti jeho ID.
async function _driveZistiPriecinokId() {
    // Najprv skús cached ID z localStorage (rýchlejšie)
    const cached = localStorage.getItem('easycena_drive_folder_id');
    if (cached) {
        // Overíme, že priečinok stále existuje (user ho mohol zmazať)
        try {
            const verResp = await fetch(`${DRIVE_API_BASE}/files/${cached}?fields=id,trashed`, {
                headers: { Authorization: 'Bearer ' + driveAccessToken }
            });
            if (verResp.ok) {
                const data = await verResp.json();
                if (!data.trashed) return cached;
            }
        } catch (e) { /* fall through */ }
        // Ak overenie zlyhalo, zmažeme cache a hľadáme znova
        localStorage.removeItem('easycena_drive_folder_id');
    }

    // 1. Hľadanie priečinka cez search query
    const q = `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const searchUrl = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`;
    const searchResp = await fetch(searchUrl, {
        headers: { Authorization: 'Bearer ' + driveAccessToken }
    });
    if (!searchResp.ok) {
        const err = new Error(`Drive search failed (${searchResp.status})`);
        err.status = searchResp.status;
        throw err;
    }
    const searchData = await searchResp.json();
    if (searchData.files && searchData.files.length > 0) {
        const folderId = searchData.files[0].id;
        localStorage.setItem('easycena_drive_folder_id', folderId);
        return folderId;
    }

    // 2. Priečinok neexistuje — vytvor ho
    const createResp = await fetch(`${DRIVE_API_BASE}/files`, {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + driveAccessToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: DRIVE_FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder'
        })
    });
    if (!createResp.ok) {
        const err = new Error(`Drive folder create failed (${createResp.status})`);
        err.status = createResp.status;
        throw err;
    }
    const created = await createResp.json();
    localStorage.setItem('easycena_drive_folder_id', created.id);
    return created.id;
}

// Multipart upload JSON súboru do daného priečinka
async function _driveUploadJsonSubor(folderId, filename, dataJson) {
    const boundary = '-------easycena' + Math.random().toString(36).slice(2);
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    // Device label do popisu Drive súboru — zobrazí sa v zozname záloh bez sťahovania
    const deviceLabel = (typeof nacitajDeviceLabel === 'function') ? nacitajDeviceLabel() : '';
    const metadata = {
        name: filename,
        parents: [folderId],
        mimeType: 'application/json',
        description: deviceLabel ? ('EasyCena záloha · ' + deviceLabel) : 'EasyCena záloha'
    };

    const body =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        dataJson +
        closeDelim;

    const resp = await fetch(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name`, {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + driveAccessToken,
            'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: body
    });
    if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        const err = new Error(`Drive upload failed (${resp.status}): ${txt.slice(0, 200)}`);
        err.status = resp.status;
        throw err;
    }
    return await resp.json();
}

// Vykreslenie pri štarte aplikácie
document.addEventListener('DOMContentLoaded', vykresliZoznamZnaciek);

// =====================================================
// TOAST NOTIFIKÁCIE
// =====================================================
// ukazToast('Text', 'success' | 'error' | 'info', durationMs)
function ukazToast(text, typ = 'info', durationMs = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast ' + typ;
    toast.textContent = text;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fading');
        setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 320);
    }, durationMs);
}

// =====================================================
// DEVICE LABEL — názov tohto zariadenia v Nastaveniach
// =====================================================
function nacitajDeviceLabel() {
    return localStorage.getItem('easycena_device_label') || '';
}
function ulozDeviceLabel(label) {
    const trimmed = String(label || '').trim().slice(0, 40);
    if (trimmed) localStorage.setItem('easycena_device_label', trimmed);
    else        localStorage.removeItem('easycena_device_label');
}
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('device-label-input');
    if (!input) return;
    input.value = nacitajDeviceLabel();
    input.addEventListener('change', () => ulozDeviceLabel(input.value));
    input.addEventListener('blur',   () => ulozDeviceLabel(input.value));
});

// =====================================================
// SYNC META — modifiedAt timestampy pre katalog/profil/archiv
// =====================================================
// easycena_meta = {
//   modifiedAt: { katalog: ms, profil: ms, archiv: ms },
//   deviceLabel: '...'   // duplikát z easycena_device_label, pre zálohu
// }
function _nacitajMeta() {
    try {
        return JSON.parse(localStorage.getItem('easycena_meta')) || { modifiedAt: {} };
    } catch (e) {
        return { modifiedAt: {} };
    }
}
function _ulozMeta(meta) {
    localStorage.setItem('easycena_meta', JSON.stringify(meta));
}
// Označí, že daný typ dát bol zmenený teraz. typ: 'katalog' | 'profil' | 'archiv'
function oznacZmeneny(typ) {
    const meta = _nacitajMeta();
    if (!meta.modifiedAt) meta.modifiedAt = {};
    meta.modifiedAt[typ] = Date.now();
    _ulozMeta(meta);
    // Auto-push: ak je užívateľ prihlásený do Drive, naplánuj synchronizáciu
    if (typeof _naplanujAutoPush === 'function') _naplanujAutoPush();
}

// =====================================================
// MANUÁLNA OBNOVA ZO DRIVE (Commit 3.2)
// =====================================================

// Otvorí modal so zoznamom záloh z Drive priečinka EasyCena_zalohy.
// Klik na záznam → confirm → stiahnutie + aplikácia + reload.
async function driveZobrazZoznamZaloh() {
    if (!driveAccessToken) {
        if (typeof ukazToast === 'function') ukazToast('Nie si prihlásený do Google Drive.', 'error');
        return;
    }

    // 1. Otvor modal s loading stavom
    const overlay = _vytvorModalRamec('📥 Obnoviť zo zálohy', 'Načítavam zoznam záloh z Google Drive…');

    try {
        // 2. Nájdi priečinok (use existing helper)
        const folderId = await _driveZistiPriecinokId();

        // 3. Listing — zoradené najnovšie hore
        const q = `'${folderId}' in parents and trashed=false and mimeType='application/json'`;
        const fields = 'files(id,name,modifiedTime,description,size)';
        const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&orderBy=modifiedTime desc&pageSize=100`;
        const resp = await fetch(url, {
            headers: { Authorization: 'Bearer ' + driveAccessToken }
        });
        if (!resp.ok) {
            const err = new Error(`Drive listing failed (${resp.status})`);
            err.status = resp.status;
            throw err;
        }
        const data = await resp.json();
        const subory = data.files || [];

        // 4. Render zoznamu
        _renderZoznamZaloh(overlay, subory);

    } catch (err) {
        console.error('Drive zoznam záloh failed:', err);
        const body = overlay.querySelector('.sync-dialog-body');
        if (body) body.textContent = '❌ Chyba: ' + (err.message || 'načítanie zlyhalo');
        if (err && err.status === 401) {
            if (confirm('Prihlásenie do Google Drive vypršalo. Chceš sa znova prihlásiť?')) {
                _zatvorModal(overlay);
                driveLogin();
            }
        }
    }
}

// Vytvorí prázdny modal s nadpisom a body textom. Vráti overlay element.
function _vytvorModalRamec(nadpis, bodyText) {
    const overlay = document.createElement('div');
    overlay.className = 'sync-dialog-overlay';
    overlay.innerHTML = `
        <div class="sync-dialog">
            <h3>${nadpis}</h3>
            <div class="sync-dialog-body">${bodyText || ''}</div>
            <button type="button" class="sync-cancel">Zrušiť</button>
        </div>
    `;
    overlay.querySelector('.sync-cancel').addEventListener('click', () => _zatvorModal(overlay));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) _zatvorModal(overlay); });
    document.body.appendChild(overlay);
    return overlay;
}

function _zatvorModal(overlay) {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
}

// Vyrenderuje zoznam súborov ako klikateľné kartičky.
function _renderZoznamZaloh(overlay, subory) {
    const body = overlay.querySelector('.sync-dialog-body');
    if (!body) return;

    if (subory.length === 0) {
        body.innerHTML = '<div class="sync-meta">V Drive priečinku <strong>EasyCena_zalohy</strong> zatiaľ nie je žiadna záloha.</div>';
        return;
    }

    let html = '<div class="sync-meta">Vyber zálohu, ktorú chceš obnoviť. Aktuálne dáta sa <strong>prepíšu</strong>.</div>';
    html += '<div class="backup-list">';
    subory.forEach((s, idx) => {
        const dt = new Date(s.modifiedTime);
        const pad = (n) => String(n).padStart(2, '0');
        const formatDate = `${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}.${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
        // description = "EasyCena záloha · <deviceLabel>" — vypreparujeme deviceLabel
        let deviceLabel = '';
        if (s.description && s.description.includes('·')) {
            deviceLabel = s.description.split('·').slice(1).join('·').trim();
        }
        const sizeKB = s.size ? Math.round(parseInt(s.size, 10) / 1024) : null;
        const metaParts = [formatDate];
        if (deviceLabel) metaParts.push('📍 ' + deviceLabel);
        if (sizeKB) metaParts.push(sizeKB + ' KB');

        html += `
            <div class="backup-item" data-file-id="${s.id}" data-file-name="${_escapeHtml(s.name)}">
                <div>
                    <div class="backup-item-name">${_escapeHtml(s.name)}</div>
                    <div class="backup-item-meta">${metaParts.join(' · ')}</div>
                </div>
                <div style="color: var(--accent-color); font-size: 18px;">›</div>
            </div>
        `;
    });
    html += '</div>';
    body.innerHTML = html;

    // Klik handler
    body.querySelectorAll('.backup-item').forEach(item => {
        item.addEventListener('click', async () => {
            const fileId = item.dataset.fileId;
            const fileName = item.dataset.fileName;
            await _stiahniAObnovZoDrive(overlay, fileId, fileName);
        });
    });
}

// =====================================================
// SILENT RE-AUTH + PULL ON OPEN + AUTO-PUSH (Commit 3.3)
// =====================================================

let _pullOnOpenSpustenyRaz = false;

// Helper: max timestamp z _meta.modifiedAt objektu
function _maxModifiedAt(modifiedAt) {
    if (!modifiedAt) return 0;
    const vals = Object.values(modifiedAt).filter(v => typeof v === 'number');
    return vals.length ? Math.max(...vals) : 0;
}

// Pri prvom otvorení appky stiahne najnovšiu zálohu z Drive a ak má
// novšie zmeny než lokál, automaticky ich aplikuje (toast + reload).
// Žiadny dialog na štarte — predpokladáme, že lokál nemá pending zmeny.
async function _skusPullOnOpen() {
    if (_pullOnOpenSpustenyRaz) return;
    _pullOnOpenSpustenyRaz = true;
    if (!driveAccessToken) return;

    try {
        const najnovsi = await _driveNajdiNajnovsiSubor();
        if (!najnovsi) return;

        const cloudData = await _driveStiahniSubor(najnovsi.id);
        if (!cloudData || !cloudData._meta) return; // stará záloha bez _meta

        const localMeta = _nacitajMeta();
        const localMax = _maxModifiedAt(localMeta.modifiedAt);
        const cloudMax = _maxModifiedAt(cloudData._meta.modifiedAt);

        if (cloudMax > localMax) {
            _aplikujZalohu(cloudData);
            const odKoho = (cloudData._meta.deviceLabel) ? ('zo zariadenia ' + cloudData._meta.deviceLabel) : 'z cloudu';
            ukazToast('☁️ Stiahnuté novšie zmeny ' + odKoho + ' — reštartujem', 'info', 2000);
            setTimeout(() => location.reload(), 2000);
        }
    } catch (err) {
        console.warn('Pull on open failed:', err);
    }
}

// Vráti metadata najnovšieho JSON súboru v priečinku EasyCena_zalohy, alebo null.
async function _driveNajdiNajnovsiSubor() {
    const folderId = await _driveZistiPriecinokId();
    const q = `'${folderId}' in parents and trashed=false and mimeType='application/json'`;
    const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=1`;
    const resp = await fetch(url, { headers: { Authorization: 'Bearer ' + driveAccessToken } });
    if (!resp.ok) {
        const err = new Error(`Drive search failed (${resp.status})`); err.status = resp.status; throw err;
    }
    const data = await resp.json();
    return (data.files && data.files.length > 0) ? data.files[0] : null;
}

// Stiahne JSON obsah daného súboru a vráti parsed objekt.
async function _driveStiahniSubor(fileId) {
    const resp = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
        headers: { Authorization: 'Bearer ' + driveAccessToken }
    });
    if (!resp.ok) {
        const err = new Error(`Drive download failed (${resp.status})`); err.status = resp.status; throw err;
    }
    return await resp.json();
}

// === AUTO-PUSH ===
// Tieto hodnoty sú zladené s 1-používateľským workflow:
// po normálnej práci (uloženie ponuky / pridanie položky) sa záloha
// vytvorí až keď je 10 minút ticho — predíde sa zbytočným uploadom
// pri viacerých rýchlych zmenách za sebou. Max-wait 1h chráni pred
// uviaznutím pri nepretržitej činnosti. Pre okamžitú zálohu je manuálne
// tlačidlo "Zálohovať teraz" v Nastaveniach.
const AUTOPUSH_DEBOUNCE_MS = 10 * 60 * 1000;  // 10 min ticha = upload
const AUTOPUSH_MAX_WAIT_MS = 60 * 60 * 1000;  // 1h poistka pri trvalej činnosti
let _autopushDebounceTimer = null;
let _autopushMaxWaitTimer = null;
let _autopushPending = false;
let _autopushBezi = false;

// Volaná z oznacZmeneny() — naštartuje 30s debounce timer.
function _naplanujAutoPush() {
    if (!driveAccessToken) return; // neprihlásený
    _autopushPending = true;
    clearTimeout(_autopushDebounceTimer);
    _autopushDebounceTimer = setTimeout(_spustiAutoPush, AUTOPUSH_DEBOUNCE_MS);
    if (!_autopushMaxWaitTimer) {
        _autopushMaxWaitTimer = setTimeout(_spustiAutoPush, AUTOPUSH_MAX_WAIT_MS);
    }
}

// Spustí sa keď debounce alebo max-wait timer vyprší.
async function _spustiAutoPush() {
    clearTimeout(_autopushDebounceTimer);
    clearTimeout(_autopushMaxWaitTimer);
    _autopushDebounceTimer = null;
    _autopushMaxWaitTimer = null;
    if (!_autopushPending) return;
    if (!driveAccessToken) return;
    if (_autopushBezi) return;
    _autopushBezi = true;
    _autopushPending = false;

    try {
        // 1. Najprv pull — má cloud novšie zmeny než my máme známe?
        const najnovsi = await _driveNajdiNajnovsiSubor();
        let cloudData = null;
        if (najnovsi) {
            cloudData = await _driveStiahniSubor(najnovsi.id);
        }

        if (cloudData && cloudData._meta) {
            const localMeta = _nacitajMeta();
            const localMax = _maxModifiedAt(localMeta.modifiedAt);
            const cloudMax = _maxModifiedAt(cloudData._meta.modifiedAt);

            if (cloudMax > localMax) {
                // KONFLIKT: cloud má novšie aj my máme nesynchronizované zmeny
                _zobrazKonfliktDialog(cloudData);
                _autopushBezi = false;
                return;
            }
        }

        // 2. Žiaden konflikt → silent push
        const folderId = await _driveZistiPriecinokId();
        const dataJson = vytvorDataZalohy();
        const ts = new Date(); const pad = (n) => String(n).padStart(2, '0');
        const filename = `easycena_zaloha_${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())}_${pad(ts.getHours())}-${pad(ts.getMinutes())}.json`;
        await _driveUploadJsonSubor(folderId, filename, dataJson);
        localStorage.setItem('easycena_drive_last_backup', String(Date.now()));
        aktualizujDriveZalohaStatus();
        ukazToast('☁️ Synchronizované', 'success', 2000);
    } catch (err) {
        console.warn('Auto-push failed:', err);
        ukazToast('⚠️ Auto-záloha zlyhala — skús neskôr cez "Zálohovať teraz"', 'error', 4000);
        // Pri 401 nech sa pri ďalšom pokuse riešia tokeny — silent reauth pri ďalšom load-e
    } finally {
        _autopushBezi = false;
    }
}

// === KONFLIKT DIALOG ===
function _zobrazKonfliktDialog(cloudData) {
    const localMeta = _nacitajMeta();
    const cloudDevLabel = (cloudData._meta && cloudData._meta.deviceLabel) || 'iné zariadenie';
    const localDevLabel = (typeof nacitajDeviceLabel === 'function' && nacitajDeviceLabel()) || 'toto zariadenie';

    const cloudExpMs = (cloudData._meta && cloudData._meta.exportedAt) || _maxModifiedAt(cloudData._meta && cloudData._meta.modifiedAt);
    const localMax = _maxModifiedAt(localMeta.modifiedAt);
    const localPrazdny = !localMax;

    const fmt = (ms) => {
        if (!ms) return '?';
        const d = new Date(ms);
        const pad = n => String(n).padStart(2, '0');
        return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    // Default: prázdne lokál → "Stiahnuť cloud", inak "Spojiť oboje"
    const defaultVoluba = localPrazdny ? 'cloud' : 'merge';

    const overlay = document.createElement('div');
    overlay.className = 'sync-dialog-overlay';
    overlay.innerHTML = `
        <div class="sync-dialog">
            <h3>⚠️ Synchronizácia — konflikt</h3>
            <div class="sync-meta">
                ☁️ <strong>Cloud (${_escapeHtml(cloudDevLabel)})</strong>: ${fmt(cloudExpMs)}<br>
                💻 <strong>Lokálne (${_escapeHtml(localDevLabel)})</strong>: ${localPrazdny ? 'žiadne lokálne zmeny' : fmt(localMax)}
            </div>
            <button type="button" class="sync-option ${defaultVoluba === 'merge' ? 'recommended' : ''}" data-action="merge">
                <div class="sync-option-title">🔄 Spojiť oboje${defaultVoluba === 'merge' ? ' (odporúčané)' : ''}</div>
                <div class="sync-option-desc">Zachová ponuky z oboch zariadení. Pri zhodnom ID vyhrá novšia. Katalóg a profil = novšia verzia.</div>
            </button>
            <button type="button" class="sync-option ${defaultVoluba === 'cloud' ? 'recommended' : ''}" data-action="cloud">
                <div class="sync-option-title">☁️ Stiahnuť cloud verziu${defaultVoluba === 'cloud' ? ' (odporúčané)' : ''}</div>
                <div class="sync-option-desc">Lokálne zmeny budú stratené.${localPrazdny ? ' Toto zariadenie zatiaľ nemá vlastné dáta.' : ''}</div>
            </button>
            <button type="button" class="sync-option" data-action="local">
                <div class="sync-option-title">💻 Použiť lokálne</div>
                <div class="sync-option-desc">Cloud sa prepíše dátami z tohto zariadenia.</div>
            </button>
            <button type="button" class="sync-cancel">Rozhodnúť neskôr</button>
        </div>
    `;
    overlay.querySelector('.sync-cancel').addEventListener('click', () => _zatvorModal(overlay));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) _zatvorModal(overlay); });
    overlay.querySelectorAll('.sync-option').forEach(btn => {
        btn.addEventListener('click', () => _vyriesKonflikt(btn.dataset.action, cloudData, overlay));
    });
    document.body.appendChild(overlay);
}

async function _vyriesKonflikt(action, cloudData, overlay) {
    const dialog = overlay.querySelector('.sync-dialog');
    dialog.innerHTML = '<h3>Synchronizujem…</h3><div class="sync-meta">Prosím počkaj.</div>';

    try {
        if (action === 'local') {
            // Push lokálnu verziu späť do cloudu, lokál sa nemení
            const folderId = await _driveZistiPriecinokId();
            const dataJson = vytvorDataZalohy();
            const ts = new Date(); const pad = (n) => String(n).padStart(2, '0');
            const filename = `easycena_zaloha_${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())}_${pad(ts.getHours())}-${pad(ts.getMinutes())}.json`;
            await _driveUploadJsonSubor(folderId, filename, dataJson);
            localStorage.setItem('easycena_drive_last_backup', String(Date.now()));
            aktualizujDriveZalohaStatus();
            _zatvorModal(overlay);
            ukazToast('☁️ Lokálne zmeny pushnuté do cloudu', 'success');
            return;
        }

        let finalData;
        if (action === 'merge') finalData = _zlucData(cloudData);
        else if (action === 'cloud') finalData = cloudData;
        else throw new Error('Neznáma akcia: ' + action);

        // Aplikuj výsledok lokálne
        _aplikujZalohu(finalData);

        // Push merged/cloud stav späť (aby všetky zariadenia konvergovali na rovnakú verziu)
        const folderId = await _driveZistiPriecinokId();
        const ts = new Date(); const pad = (n) => String(n).padStart(2, '0');
        const filename = `easycena_zaloha_${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())}_${pad(ts.getHours())}-${pad(ts.getMinutes())}.json`;
        const novyJson = vytvorDataZalohy(); // už beží nad merged dátami v localStorage
        await _driveUploadJsonSubor(folderId, filename, novyJson);
        localStorage.setItem('easycena_drive_last_backup', String(Date.now()));

        _zatvorModal(overlay);
        const txt = action === 'merge' ? '☁️ Zlúčené — reštartujem' : '☁️ Stiahnuté z cloudu — reštartujem';
        ukazToast(txt, 'success', 1500);
        setTimeout(() => location.reload(), 1500);
    } catch (err) {
        console.error('Konflikt resolution failed:', err);
        dialog.innerHTML = '<h3>❌ Chyba</h3><div class="sync-meta">' + _escapeHtml(err.message || 'sync zlyhal') + '</div><button type="button" class="sync-cancel">Zavrieť</button>';
        dialog.querySelector('.sync-cancel').addEventListener('click', () => _zatvorModal(overlay));
    }
}

// === MERGE LOGIKA ===
function _zlucData(cloudData) {
    const localMetaRaw = _nacitajMeta();
    const local = {
        katalog: katalog,
        archiv: archiv,
        profil: localStorage.getItem('easycena_profil') ? JSON.parse(localStorage.getItem('easycena_profil')) : null,
        logo: localStorage.getItem('easycena_logo') || null,
        podpis: localStorage.getItem('easycena_podpis') || null,
        pocitadlo: localStorage.getItem('easycena_pocitadlo') || 1,
        nastavenia: localStorage.getItem('easycena_nastavenia') ? JSON.parse(localStorage.getItem('easycena_nastavenia')) : null,
        _meta: { modifiedAt: (localMetaRaw && localMetaRaw.modifiedAt) || {} }
    };
    const cloudMA = (cloudData._meta && cloudData._meta.modifiedAt) || {};
    const localMA = local._meta.modifiedAt;

    const merged = { ...local };

    // Katalog: meta-level — novšia verzia vyhráva
    const lkat = localMA.katalog || 0, ckat = cloudMA.katalog || 0;
    if (ckat > lkat) merged.katalog = cloudData.katalog || [];

    // Profil: meta-level (logo + podpis idú spolu)
    const lpro = localMA.profil || 0, cpro = cloudMA.profil || 0;
    if (cpro > lpro) {
        merged.profil = cloudData.profil;
        if (cloudData.logo)   merged.logo   = cloudData.logo;
        if (cloudData.podpis) merged.podpis = cloudData.podpis;
    }

    // Archív: per-record podľa modifiedAt (s fallback na _meta.modifiedAt.archiv pre staré záznamy)
    merged.archiv = _zlucArchiv(
        local.archiv || [],
        cloudData.archiv || [],
        localMA.archiv || 0,
        cloudMA.archiv || 0
    );

    // _meta: vezme max() z oboch
    merged._meta = {
        modifiedAt: {
            katalog: Math.max(lkat, ckat),
            profil:  Math.max(lpro, cpro),
            archiv:  Math.max(localMA.archiv || 0, cloudMA.archiv || 0)
        }
    };

    return merged;
}

function _zlucArchiv(localArr, cloudArr, localFallback, cloudFallback) {
    // Kľúč = id ponuky. Pri konflikte (rovnaké id) vyhrá vyšší modifiedAt.
    const map = new Map();
    localArr.forEach(p => {
        const ts = (typeof p.modifiedAt === 'number') ? p.modifiedAt : localFallback;
        map.set(p.id, { ponuka: p, ts: ts });
    });
    cloudArr.forEach(p => {
        const ts = (typeof p.modifiedAt === 'number') ? p.modifiedAt : cloudFallback;
        const existing = map.get(p.id);
        if (!existing || ts > existing.ts) {
            map.set(p.id, { ponuka: p, ts: ts });
        }
    });
    // Zoradenie podľa id desc (chronologicky najnovšie hore — ako v existujúcom UI)
    return Array.from(map.values()).map(x => x.ponuka).sort((a, b) => (b.id || 0) - (a.id || 0));
}

function _escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Stiahne JSON obsah zo zvoleného Drive súboru, opýta sa na potvrdenie a aplikuje.
async function _stiahniAObnovZoDrive(overlay, fileId, fileName) {
    if (!confirm(`Naozaj obnoviť zo zálohy "${fileName}"?\nAktuálne dáta sa prepíšu. Akcia sa nedá vrátiť.`)) {
        return;
    }
    const body = overlay.querySelector('.sync-dialog-body');
    if (body) body.innerHTML = '<div class="sync-meta">Sťahujem zálohu zo Google Drive…</div>';

    try {
        const resp = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
            headers: { Authorization: 'Bearer ' + driveAccessToken }
        });
        if (!resp.ok) {
            const err = new Error(`Drive download failed (${resp.status})`);
            err.status = resp.status;
            throw err;
        }
        const data = await resp.json();

        // Aplikuj zálohu cez zdieľaný helper (rovnaký ako pre lokálny obnovitZalohu)
        _aplikujZalohu(data);

        if (typeof ukazToast === 'function') ukazToast('☁️ Záloha obnovená — aplikácia sa reštartuje', 'success');
        _zatvorModal(overlay);

        // Krátka pauza aby toast zazrel + reload
        setTimeout(() => location.reload(), 800);
    } catch (err) {
        console.error('Drive download/apply failed:', err);
        if (body) body.innerHTML = '<div class="sync-meta" style="border: 1px solid var(--danger-btn-bg-color);">❌ Chyba: ' + (err.message || 'sťahovanie zlyhalo') + '</div>';
        if (err && err.status === 401) {
            if (confirm('Prihlásenie do Google Drive vypršalo. Chceš sa znova prihlásiť?')) {
                _zatvorModal(overlay);
                driveLogin();
            }
        }
    }
}