(function () {
  var toast = document.querySelector('.toast-demo'), t;
  function dire(msg) { toast.textContent = msg; toast.classList.add('visible'); clearTimeout(t); t = setTimeout(function () { toast.classList.remove('visible'); }, 3200); }
  document.addEventListener('submit', function (e) {
    var f = e.target, a = f.getAttribute('action') || '';
    e.preventDefault(); e.stopImmediatePropagation();
    if (/connexion/.test(a) && !/deconnexion/.test(a)) { location.href = 'index.html'; return; }
    if (/deconnexion/.test(a)) { location.href = 'connexion.html'; return; }
    if (f.method === 'get') { dire('Démo : la recherche fonctionnera dans la version réelle.'); return; }
    dire('Démo : action désactivée. Dans la version réelle, elle est enregistrée immédiatement.');
  }, true);
  var email = document.querySelector('input[type=email]');
  if (email && /connexion/.test(location.pathname + document.title.toLowerCase())) {
    email.value = 'test@equation-bc.fr';
    var mdp = document.querySelector('input[type=password]');
    if (mdp) { mdp.value = 'demonstration'; }
  }
})();
