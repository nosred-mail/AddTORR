/* Tema claro/escuro: respeita o sistema até o usuário escolher; a escolha fica salva. */
(function () {
  var KEY = 'addtorr-theme', root = document.documentElement, mq = window.matchMedia('(prefers-color-scheme: dark)');
  function saved() { try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : null; } catch (e) { return null; } }
  function current() { return root.getAttribute('data-theme') || (mq.matches ? 'dark' : 'light'); }
  function apply(t) {
    root.setAttribute('data-theme', t);
    document.querySelectorAll('.theme-toggle').forEach(function (b) {
      var next = t === 'dark' ? 'claro' : 'escuro';
      b.setAttribute('aria-label', 'Mudar para o tema ' + next);
      b.setAttribute('title', 'Mudar para o tema ' + next);
    });
  }
  apply(saved() || (mq.matches ? 'dark' : 'light'));
  document.addEventListener('DOMContentLoaded', function () {
    apply(current());
    document.querySelectorAll('.theme-toggle').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = current() === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(KEY, t); } catch (e) {}
        apply(t);
      });
    });
  });
  var onChange = function () { if (!saved()) apply(mq.matches ? 'dark' : 'light'); };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
})();
