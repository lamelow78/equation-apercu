/* Espace EQUATION B&C : petits comportements de l'interface (aucune dépendance) */
(function () {
  'use strict';
  var csrf = (document.querySelector('meta[name=csrf]') || {}).content;

  // Confirmation avant une action sensible (suppression, désactivation…)
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-confirmer]');
    if (b && !window.confirm(b.getAttribute('data-confirmer'))) { e.preventDefault(); e.stopPropagation(); }
    var retour = e.target.closest('[data-retour]');
    if (retour && window.history.length > 1) { e.preventDefault(); window.history.back(); }
  }, true);

  // Filtre qui s'applique dès qu'on change la liste
  document.querySelectorAll('[data-auto-envoi]').forEach(function (s) {
    s.addEventListener('change', function () { s.form.submit(); });
  });

  // Fermer les menus d'actions quand on clique ailleurs
  document.addEventListener('click', function (e) {
    document.querySelectorAll('details.menu-actions[open]').forEach(function (d) { if (!d.contains(e.target)) d.removeAttribute('open'); });
  });

  // Aperçu des photos de ticket choisies
  document.querySelectorAll('[data-apercu-photos]').forEach(function (input) {
    var zone = input.closest('.zone-photo').querySelector('.zone-photo__apercus');
    input.addEventListener('change', function () {
      zone.innerHTML = '';
      Array.prototype.forEach.call(input.files, function (f) {
        if (/^image\/(jpeg|png|webp|gif)$/.test(f.type)) {
          var img = document.createElement('img');
          img.alt = f.name; img.src = URL.createObjectURL(f);
          zone.appendChild(img);
        } else {
          var s = document.createElement('span'); s.textContent = f.name; zone.appendChild(s);
        }
      });
    });
  });

  // Calcul automatique de la TVA à partir du montant TTC et du taux
  document.querySelectorAll('[data-taux]').forEach(function (selectTaux) {
    var form = selectTaux.form;
    var montant = form.querySelector('[data-montant]');
    var tva = form.querySelector('[data-tva]');
    var lire = function (v) { var n = parseFloat(String(v).replace(/\s|€/g, '').replace(',', '.')); return isNaN(n) ? null : n; };
    var calculer = function () {
      var taux = selectTaux.value, ttc = lire(montant.value);
      if (taux === '' || ttc === null) return;
      var t = Number(taux);
      tva.value = (Math.round((ttc - ttc / (1 + t / 100)) * 100) / 100).toFixed(2).replace('.', ',');
    };
    // Si une TVA existe déjà (modification), on retrouve le taux correspondant
    var ttc0 = lire(montant.value), tva0 = lire(tva.value);
    if (ttc0 && tva0 !== null) {
      var trouve = ['20', '10', '5.5', '0'].filter(function (t) { return Math.abs(ttc0 - ttc0 / (1 + Number(t) / 100) - tva0) < 0.02; })[0];
      selectTaux.value = trouve !== undefined ? trouve : '';
    }
    selectTaux.addEventListener('change', calculer);
    montant.addEventListener('input', calculer);
    tva.addEventListener('input', function () { selectTaux.value = ''; });
  });

  // Bouton « en cours » pendant l'envoi d'un formulaire avec fichiers
  document.querySelectorAll('form[data-envoi]:not([data-depot])').forEach(function (form) {
    form.addEventListener('submit', function () {
      var b = form.querySelector('[type=submit]');
      if (b) { setTimeout(function () { b.disabled = true; b.textContent = 'Enregistrement en cours…'; }, 0); }
    });
  });

  // Dépôt de documents dans un dossier : glisser-déposer + barre de progression
  document.querySelectorAll('form[data-depot]').forEach(function (form) {
    var input = form.querySelector('input[type=file]');
    var liste = form.querySelector('.depot__liste');
    var bouton = form.querySelector('[type=submit]');
    var afficher = function () {
      liste.innerHTML = '';
      Array.prototype.forEach.call(input.files, function (f) {
        var d = document.createElement('div');
        d.textContent = f.name + ' (' + (f.size > 1048576 ? (f.size / 1048576).toFixed(1).replace('.', ',') + ' Mo' : Math.ceil(f.size / 1024) + ' Ko') + ')';
        liste.appendChild(d);
      });
      bouton.textContent = input.files.length > 1 ? 'Envoyer les ' + input.files.length + ' fichiers' : 'Envoyer';
    };
    input.addEventListener('change', afficher);
    ['dragenter', 'dragover'].forEach(function (t) { form.addEventListener(t, function (e) { e.preventDefault(); form.classList.add('survol'); }); });
    ['dragleave', 'drop'].forEach(function (t) { form.addEventListener(t, function () { form.classList.remove('survol'); }); });
    form.addEventListener('drop', function (e) {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files.length) { input.files = e.dataTransfer.files; afficher(); }
    });
    form.addEventListener('submit', function (e) {
      if (!input.files.length) { e.preventDefault(); input.click(); return; }
      if (!window.XMLHttpRequest || !window.FormData) return; // envoi classique
      e.preventDefault();
      var barre = document.createElement('div'); barre.className = 'progression'; barre.innerHTML = '<span></span>';
      form.appendChild(barre);
      bouton.disabled = true; bouton.textContent = 'Envoi… 0 %';
      var xhr = new XMLHttpRequest();
      xhr.open('POST', form.action);
      xhr.setRequestHeader('Accept', 'application/json');
      if (csrf) xhr.setRequestHeader('X-CSRF', csrf);
      xhr.upload.onprogress = function (ev) {
        if (!ev.lengthComputable) return;
        var p = Math.round(ev.loaded / ev.total * 100);
        barre.firstChild.style.width = p + '%';
        bouton.textContent = p < 100 ? 'Envoi… ' + p + ' %' : 'Traitement…';
      };
      xhr.onload = function () {
        var rep = null;
        try { rep = JSON.parse(xhr.responseText); } catch (err) { /* page d'erreur HTML */ }
        if (xhr.status < 400 && rep && rep.url) { window.location.href = rep.url; return; }
        document.open(); document.write(xhr.responseText); document.close();
      };
      xhr.onerror = function () { bouton.disabled = false; bouton.textContent = 'Réessayer l’envoi'; alert('Connexion perdue pendant l’envoi. Vérifiez votre réseau et réessayez.'); };
      xhr.send(new FormData(form));
    });
  });
})();
