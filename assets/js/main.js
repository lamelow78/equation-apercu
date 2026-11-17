/* EQUATION B&C — scripts du site (sans dépendance) */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  var calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Texte qui s'allume mot à mot (découpage sans toucher aux balises) ---------- */
  var blocsMots = Array.prototype.slice.call(document.querySelectorAll('.mots'));
  blocsMots.forEach(function (bloc) {
    var parcourir = function (noeud) {
      Array.prototype.slice.call(noeud.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (m) {
            if (!m) { return; }
            if (/^\s+$/.test(m)) { frag.appendChild(document.createTextNode(m)); return; }
            var s = document.createElement('span'); s.className = 'm'; s.textContent = m; frag.appendChild(s);
          });
          noeud.replaceChild(frag, n);
        } else if (n.nodeType === 1) { parcourir(n); }
      });
    };
    parcourir(bloc);
  });
  var listesMots = blocsMots.map(function (b) { return { bloc: b, mots: b.querySelectorAll('.m'), allumes: -1 }; });

  /* ---------- Îlot qui se resserre, mots, barre mobile (lecture puis écriture) ---------- */
  var ile = document.querySelector('.ile');
  var barre = document.querySelector('.barre-mobile');
  var enAttente = false;
  var surDefilement = function () {
    enAttente = false;
    var y = window.scrollY, h = window.innerHeight, total = document.documentElement.scrollHeight;
    var positions = listesMots.map(function (e) { return e.bloc.getBoundingClientRect(); });
    if (ile) { ile.classList.toggle('compacte', y > 60); }
    if (barre) { barre.classList.toggle('cachee', h + y > total - 320); }
    listesMots.forEach(function (e, i) {
      var r = positions[i];
      var p = calme ? 1 : Math.min(Math.max((h * 0.85 - r.top) / (r.height + h * 0.3), 0), 1);
      var n = Math.round(p * e.mots.length);
      if (n === e.allumes) { return; }
      e.allumes = n;
      for (var j = 0; j < e.mots.length; j++) { e.mots[j].classList.toggle('on', j < n); }
    });
  };
  window.addEventListener('scroll', function () { if (!enAttente) { enAttente = true; requestAnimationFrame(surDefilement); } }, { passive: true });
  window.addEventListener('resize', surDefilement);
  surDefilement();

  /* ---------- Menu mobile ---------- */
  var menu = document.getElementById('menu');
  var burger = document.querySelector('.burger');
  if (menu && burger) {
    var fermer = menu.querySelector('.menu__fermer');
    var ouvrir = function (etat) {
      menu.classList.toggle('ouvert', etat);
      menu.setAttribute('aria-hidden', String(!etat));
      menu.inert = !etat;
      burger.setAttribute('aria-expanded', String(etat));
      document.body.style.overflow = etat ? 'hidden' : '';
      document.querySelectorAll('main, footer, .barre-mobile, .ile').forEach(function (el) { el.inert = etat; });
      (etat ? fermer : burger).focus();
    };
    menu.inert = true;
    burger.addEventListener('click', function () { ouvrir(true); });
    fermer.addEventListener('click', function () { ouvrir(false); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) { ouvrir(false); } });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('ouvert')) { ouvrir(false); }
    });
  }

  /* ---------- Apparition discrète au défilement ---------- */
  var aAnimer = document.querySelectorAll('.r, .r-img');
  if ('IntersectionObserver' in window && aAnimer.length) {
    var obs = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('vu'); obs.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    aAnimer.forEach(function (el) { obs.observe(el); });
  } else {
    aAnimer.forEach(function (el) { el.classList.add('vu'); });
  }

  /* ---------- Horaires : ouvert / fermé (heure de Paris) ---------- */
  // Lundi à vendredi, 8 h – 18 h. 0 = dimanche.
  var HORAIRES = { 1: [8, 18], 2: [8, 18], 3: [8, 18], 4: [8, 18], 5: [8, 18] };
  var maintenant = (function () {
    try {
      var p = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      var jours = { 'dim.': 0, 'lun.': 1, 'mar.': 2, 'mer.': 3, 'jeu.': 4, 'ven.': 5, 'sam.': 6 };
      var o = {}; p.forEach(function (x) { o[x.type] = x.value; });
      return { jour: jours[o.weekday], heure: parseInt(o.hour, 10) + parseInt(o.minute, 10) / 60 };
    } catch (e) { var d = new Date(); return { jour: d.getDay(), heure: d.getHours() + d.getMinutes() / 60 }; }
  })();
  var plage = HORAIRES[maintenant.jour];
  var ouvert = !!plage && maintenant.heure >= plage[0] && maintenant.heure < plage[1];
  document.querySelectorAll('[data-statut]').forEach(function (el) {
    el.textContent = ouvert ? 'Ouvert jusqu’à ' + plage[1] + ' h' : 'Fermé actuellement';
    el.classList.toggle('ouvert', ouvert);
  });
  document.querySelectorAll('.horaires [data-jour="' + maintenant.jour + '"]').forEach(function (li) {
    li.classList.add('aujourdhui');
  });

  /* ---------- Réalisations : filtres ---------- */
  var filtres = document.querySelectorAll('.filtre');
  if (filtres.length) {
    var cartes = document.querySelectorAll('[data-cat]');
    filtres.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cat = btn.getAttribute('data-filtre');
        filtres.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        cartes.forEach(function (c) {
          c.hidden = cat !== 'tout' && c.getAttribute('data-cat').split(' ').indexOf(cat) === -1;
        });
      });
    });
  }

  /* ---------- Réalisations : visionneuse ---------- */
  var visio = document.querySelector('.visionneuse');
  if (visio && typeof visio.showModal === 'function') {
    var vImg = visio.querySelector('img');
    var vTxt = visio.querySelector('p');
    document.querySelectorAll('[data-grand]').forEach(function (b) {
      b.addEventListener('click', function () {
        vImg.src = b.getAttribute('data-grand');
        vImg.alt = b.querySelector('img').alt;
        vTxt.textContent = b.querySelector('strong').textContent;
        visio.showModal();
      });
    });
    visio.querySelector('.visionneuse__fermer').addEventListener('click', function () { visio.close(); });
    visio.addEventListener('click', function (e) { if (e.target === visio) { visio.close(); } });
  }

  /* ---------- Formulaire de contact ---------- */
  var form = document.querySelector('[data-formulaire]');
  if (form) {
    var debut = form.querySelector('[name="t"]');
    if (debut) { debut.value = String(Math.floor(Date.now() / 1000)); }
    var msg = form.querySelector('.message-form');
    var verifs = {
      nom: function (v) { return v.trim().length >= 2 ? '' : 'Indiquez votre nom.'; },
      telephone: function (v) {
        var n = v.replace(/[\s.\-()]/g, '');
        if (!n) { return ''; }
        return /^(\+33|0033|0)[1-9]\d{8}$/.test(n) ? '' : 'Ce numéro ne semble pas valide (ex. 06 12 34 56 78).';
      },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Indiquez une adresse e-mail valide.'; },
      message: function (v) { return v.trim().length >= 10 ? '' : 'Décrivez votre projet en quelques mots.'; }
    };
    var verifier = function (champ) {
      var f = verifs[champ.name]; if (!f) { return true; }
      var err = f(champ.value);
      var zone = document.getElementById('err-' + champ.name);
      champ.setAttribute('aria-invalid', err ? 'true' : 'false');
      if (zone) { zone.textContent = err; }
      return !err;
    };
    Object.keys(verifs).forEach(function (nom) {
      var c = form.elements[nom]; if (!c) { return; }
      c.addEventListener('blur', function () { if (c.value) { verifier(c); } });
      c.addEventListener('input', function () { if (c.getAttribute('aria-invalid') === 'true') { verifier(c); } });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.textContent = ''; msg.className = 'message-form';
      var premier = null;
      Object.keys(verifs).forEach(function (nom) {
        var c = form.elements[nom];
        if (c && !verifier(c) && !premier) { premier = c; }
      });
      var rgpd = form.elements.consentement;
      var errRgpd = document.getElementById('err-consentement');
      if (rgpd && !rgpd.checked) {
        errRgpd.textContent = 'Merci de cocher cette case pour que nous puissions vous répondre.';
        if (!premier) { premier = rgpd; }
      } else if (errRgpd) { errRgpd.textContent = ''; }
      if (premier) { premier.focus(); return; }

      var bouton = form.querySelector('[type=submit]');
      var texte = bouton.innerHTML;
      bouton.disabled = true; bouton.textContent = 'Envoi en cours…';
      var echec = function (t) {
        msg.className = 'message-form ko';
        msg.textContent = t || 'L’envoi n’a pas abouti. Appelez-nous au 01 80 28 12 47 ou écrivez à contact@equation-bc.fr.';
        bouton.disabled = false; bouton.innerHTML = texte;
      };
      if (form.hasAttribute('data-apercu')) {
        msg.className = 'message-form ko'; msg.style.background = '#eaf3ec'; msg.style.color = '#1e5c37';
        msg.textContent = 'Version d’aperçu : le formulaire fonctionnera une fois le site mis en ligne. Aucune donnée n’a été envoyée.';
        bouton.disabled = false; bouton.innerHTML = texte; return;
      }
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (rep) { if (rep && rep.ok) { window.location.href = 'merci.html'; } else { echec(rep && rep.erreur); } })
        .catch(function () { echec('Connexion impossible. Appelez-nous au 01 80 28 12 47 ou écrivez à contact@equation-bc.fr.'); });
    });
  }

  /* ---------- Diaporama de l'ouverture (balayage latéral) ---------- */
  var dia = document.querySelector('[data-diaporama]');
  if (dia) {
    var diapos = dia.querySelectorAll('.diapo');
    var barres = dia.querySelectorAll('[data-aller]');
    var compteur = dia.querySelector('.diaporama__compteur b');
    var actuelle = 0, nettoyage = null;
    var lancerBarre = function () {
      barres.forEach(function (b) { b.classList.remove('en-cours'); });
      if (calme) { return; }
      var cible = barres[actuelle];
      // deux images plus tard : relance l'animation sans forcer de recalcul de la page
      requestAnimationFrame(function () { requestAnimationFrame(function () { cible.classList.add('en-cours'); }); });
    };
    var aller = function (n) {
      n = (n + diapos.length) % diapos.length;
      if (n === actuelle) { return; }
      var avant = diapos[actuelle];
      diapos.forEach(function (d) { d.classList.remove('sortante'); });
      avant.classList.remove('active'); avant.classList.add('sortante'); avant.setAttribute('aria-hidden', 'true');
      actuelle = n;
      diapos[n].classList.add('active'); diapos[n].removeAttribute('aria-hidden');
      barres.forEach(function (b, i) { if (i === n) { b.setAttribute('aria-current', 'true'); } else { b.removeAttribute('aria-current'); } });
      if (compteur) { compteur.textContent = (n < 9 ? '0' : '') + (n + 1); }
      clearTimeout(nettoyage);
      nettoyage = setTimeout(function () { avant.classList.remove('sortante'); }, 1300);
      lancerBarre();
    };
    barres.forEach(function (b) {
      b.addEventListener('click', function () { aller(parseInt(b.getAttribute('data-aller'), 10)); });
      b.querySelector('span').addEventListener('animationend', function () { if (b.classList.contains('en-cours')) { aller(actuelle + 1); } });
    });
    dia.querySelector('[data-prec]').addEventListener('click', function () { aller(actuelle - 1); });
    dia.querySelector('[data-suiv]').addEventListener('click', function () { aller(actuelle + 1); });
    // Glisser du doigt pour changer de photo
    var x0 = null;
    dia.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { x0 = e.clientX; } });
    dia.addEventListener('pointerup', function (e) {
      if (x0 === null) { return; }
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 45) { aller(actuelle + (dx < 0 ? 1 : -1)); }
    });
    // Pause quand le diaporama n'est pas à l'écran
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { dia.classList.toggle('hors-ecran', !e[0].isIntersecting); }).observe(dia);
    }
    // Démarre une fois la page chargée, pour ne pas ralentir l'affichage
    var demarrer = function () { setTimeout(function () { dia.classList.add('pret'); lancerBarre(); }, 300); };
    if (document.readyState === 'complete') { demarrer(); } else { window.addEventListener('load', demarrer); }
  }

  /* ---------- Rail horizontal des réalisations ---------- */
  document.querySelectorAll('[data-rail]').forEach(function (rail) {
    var piste = rail.querySelector('.rail__piste');
    var prec = rail.querySelector('[data-rail-prec]');
    var suiv = rail.querySelector('[data-rail-suiv]');
    var barre = rail.querySelector('.rail__progres');
    var pas = function () {
      var c = piste.children[0];
      return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(piste).columnGap || 0) : piste.clientWidth;
    };
    var maj = function () {
      var max = piste.scrollWidth - piste.clientWidth;
      var p = max > 0 ? piste.scrollLeft / max : 1;
      var visible = piste.clientWidth / piste.scrollWidth;
      barre.style.setProperty('--p', Math.max(visible, Math.min(1, visible + p * (1 - visible))).toFixed(3));
      prec.disabled = piste.scrollLeft <= 2;
      suiv.disabled = piste.scrollLeft >= max - 2;
    };
    prec.addEventListener('click', function () { piste.scrollBy({ left: -pas(), behavior: calme ? 'auto' : 'smooth' }); });
    suiv.addEventListener('click', function () { piste.scrollBy({ left: pas(), behavior: calme ? 'auto' : 'smooth' }); });
    piste.addEventListener('scroll', maj, { passive: true });
    window.addEventListener('resize', maj);
    // Première mesure après le chargement (évite un recalcul de mise en page pendant l'affichage)
    var plusTard = window.requestIdleCallback || function (f) { setTimeout(f, 200); };
    if (document.readyState === 'complete') { plusTard(maj); } else { window.addEventListener('load', function () { plusTard(maj); }); }
    // Glisser à la souris (sur écran tactile, le défilement natif suffit)
    var depart = null, gauche = 0, bouge = false;
    piste.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) { return; }
      depart = e.clientX; gauche = piste.scrollLeft; bouge = false;
    });
    window.addEventListener('pointermove', function (e) {
      if (depart === null) { return; }
      var dx = e.clientX - depart;
      if (!bouge && Math.abs(dx) > 5) { bouge = true; piste.classList.add('glisse'); }
      if (bouge) { piste.scrollLeft = gauche - dx; }
    });
    window.addEventListener('pointerup', function () {
      if (depart === null) { return; }
      depart = null;
      if (bouge) {
        piste.classList.remove('glisse');
        // Cale la piste sur la carte la plus proche
        var p = pas();
        piste.scrollTo({ left: Math.round(piste.scrollLeft / p) * p, behavior: calme ? 'auto' : 'smooth' });
      }
    });
    // Un glisser ne doit pas ouvrir la carte sous la souris
    piste.addEventListener('click', function (e) { if (bouge) { e.preventDefault(); e.stopPropagation(); bouge = false; } }, true);
    piste.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); suiv.click(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prec.click(); }
    });
  });

  /* ---------- Année du pied de page ---------- */
  document.querySelectorAll('[data-annee]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
