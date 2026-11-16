'use strict';
(() => {
  const profiles = createLocalProfiles('cuereport');
  const shell = document.querySelector('.shell');
  const surface = document.createElement('div'); surface.id = 'product-surface'; surface.hidden = true;
  surface.innerHTML = `
    <header class="product-header"><a class="product-brand" href="#/">CueReport</a>
      <nav aria-label="Product"><details><summary>Features</summary><div class="product-menu">
        <a href="#/app/check"><strong>Report checks</strong><span>Recognized evidence and missing details.</span></a>
        <a href="#/app/draft"><strong>Draft & exports</strong><span>Structured Markdown for a maintainer.</span></a>
      </div></details><details><summary>Use cases</summary><div class="product-menu">
        <a href="#/app/draft"><strong>Prepare a report</strong><span>Preserve what happened and what was expected.</span></a>
        <a href="#/app/research/methods"><strong>Review the study</strong><span>Inspect saved results and research limits.</span></a>
      </div></details><details><summary>How it works</summary><div class="product-menu">
        <a href="#/app/examples"><strong>Examples</strong><span>Inspect public Android reports.</span></a>
        <a href="#/app/research/methods"><strong>Research & methods</strong><span>Understand the rules and exploratory study.</span></a>
      </div></details></nav>
      <div class="product-actions"><a href="#/login">Log in</a><a class="btn" href="#/signup">Create account</a><a class="btn primary" href="#/app">Launch Workspace</a><span id="header-profile" hidden></span><button type="button" data-logout id="header-logout" hidden>Log out</button><button class="btn theme-toggle" type="button" aria-pressed="false">Dark theme</button></div>
    </header>
    <main id="product-main" tabindex="-1">
      <section data-product-page="home" class="product-hero">
        <div><p class="product-kicker">Android accessibility reports</p><h1 tabindex="-1">Keep the evidence.<br>Complete the report.</h1><p class="product-lead">Check the details in a TalkBack report, fill the gaps and prepare a portable draft for the maintainer.</p>
          <div class="product-actions"><button type="button" class="btn primary" data-demo>Try Live Demo</button><a class="btn" href="#/signup">Create free account</a></div>
          <p>All tools are free. Profiles are optional.</p><a href="#/app/research/methods">Checks, coverage & research limits</a>
        </div>
        <section class="hero-task" aria-labelledby="hero-task-title"><h2 id="hero-task-title">Check a report</h2><label for="hero-input">Report excerpt</label><textarea id="hero-input" maxlength="4000" rows="5">With TalkBack enabled, swipe to Save. It announces “Button”. Expected: “Save, button”. Actual: “Button”.</textarea><div class="product-actions"><button id="hero-run" class="btn primary" type="button">Check details</button><button id="hero-continue" class="btn" type="button">Continue in workspace</button></div><div id="hero-output" role="status"></div></section>
        <div class="product-showcase" aria-label="Product preview">
          <div class="product-preview" data-slide="0"><p class="product-kicker">Report · illustrative example</p><h2>Start with what happened.</h2><blockquote>With TalkBack enabled, swipe to Save. The control is announced as “Button” without a name.</blockquote><p>Expected: “Save, button”. Actual: “Button”.</p><p>This is a report example, not a test of a live app.</p></div>
          <div class="product-preview" data-slide="1" hidden><p class="product-kicker">Evidence checks</p><h2>See which details are recognized.</h2><div class="preview-row">TalkBack interaction<span>Present</span></div><div class="preview-row">Expected and actual<span>Present</span></div><div class="preview-row">App and Android versions<span>Add details</span></div><p>English-oriented rules check the report, not the target app.</p></div>
          <div class="product-preview" data-slide="2" hidden><p class="product-kicker">Report repair</p><h2>Keep every detail yours.</h2><dl><dt>Environment</dt><dd>Your app, OS and device versions</dd><dt>Reproduction</dt><dd>Your gestures and spoken output</dd><dt>Draft</dt><dd>Original evidence retained</dd></dl><p>Missing information stays marked. Nothing is invented.</p></div>
          <div class="product-preview" data-slide="3" hidden><p class="product-kicker">Maintainer handoff</p><h2>A draft you can take with you.</h2><div class="preview-tags"><span>Markdown</span><span>Clipboard</span><span>GitHub draft</span></div><p>Review the output and submit it yourself. No issue is posted automatically.</p><p>Save drafts explicitly to an optional local profile.</p></div>
          <div class="product-showcase-controls" aria-label="Preview controls"><button type="button" data-slide-select="0" aria-pressed="true">Report</button><button type="button" data-slide-select="1" aria-pressed="false">Checks</button><button type="button" data-slide-select="2" aria-pressed="false">Repair</button><button type="button" data-slide-select="3" aria-pressed="false">Handoff</button><button type="button" id="preview-pause">Pause previews</button></div>
        </div>
      </section>
      <section data-product-page="auth" class="product-auth" hidden>
        <form id="profile-form"><h1 id="profile-heading" tabindex="-1">Log in</h1><p>Saved on this browser.</p>
          <label for="profile-name">Profile name</label><input id="profile-name" name="username" autocomplete="username" required minlength="3" maxlength="40">
          <label for="profile-password">Password</label><div class="password-field"><input id="profile-password" name="password" type="password" autocomplete="current-password" required minlength="12" maxlength="256"><button type="button" id="password-toggle" aria-pressed="false">Show password</button></div>
          <p class="small">12–256 characters. Password managers and paste are supported.</p>
          <p id="pending-guest-note" hidden>Only the current report will be imported. After login, choose a name and Save to confirm.</p><p id="profile-error" role="alert"></p><button type="submit" class="btn primary" id="profile-submit">Log in</button>
          <button type="button" class="btn" data-demo>Continue with Demo</button><a id="profile-switch" href="#/signup">Create a local profile</a>
        </form>
        <aside><h2>Your drafts, on this browser.</h2><p>Save up to ten named report drafts. Every public tool is also available to guests.</p><p>Passwords are hashed; saved work is not encrypted. These profiles do not provide cloud sync, verified identity or password recovery.</p><p>Other apps on this GitHub Pages origin share browser storage. Use a separate browser profile for device-level separation.</p></aside>
      </section>
      <section data-product-page="saved" class="product-saved" hidden><h1 tabindex="-1">Saved work</h1><p id="profile-identity"></p><p>Saved on this browser. Restored drafts remain editable.</p><ul id="saved-work-list"></ul><p id="saved-work-status" role="status"></p><button type="button" class="btn" id="delete-all-work">Delete all saved work</button><a class="btn" href="#/app">Open workspace</a><button type="button" class="btn" data-logout>Log out</button></section>
    </main>`;
  shell.before(surface);
  const navigation = document.createElement('details'); navigation.className = 'product-navigation';
  const navigationSummary = document.createElement('summary'); navigationSummary.textContent = 'Menu';
  const navigationContent = document.createElement('div'); navigationContent.className = 'product-navigation-content';
  const productHeader = surface.querySelector('.product-header');
  navigationContent.append(productHeader.querySelector('nav'));
  surface.before(productHeader);
  navigation.append(navigationSummary, navigationContent); productHeader.append(navigation);
  const compactNavigation = matchMedia('(max-width:1000px)');
  const syncNavigation = () => { navigation.open = !compactNavigation.matches; };
  compactNavigation.addEventListener('change', syncNavigation); syncNavigation();
  navigation.addEventListener('keydown', (event) => { if (event.key === 'Escape' && compactNavigation.matches) { navigation.open = false; navigationSummary.focus(); event.preventDefault(); } });

  const bar = document.createElement('nav'); bar.className = 'profile-tools'; bar.setAttribute('aria-label', 'Local profile');
  bar.innerHTML = '<a href="#/">Home</a><a id="workspace-profile" href="#/login">Local profile</a><button type="button" id="save-work" class="btn">Save work</button><a href="#/saved">Saved work</a><button type="button" class="btn" data-logout hidden>Log out</button>';
  document.querySelector('.main-col').insertBefore(bar, document.querySelector('#main'));
  const saveDialog = document.createElement('dialog'); saveDialog.className = 'product-save-dialog';
  saveDialog.innerHTML = '<form id="save-work-form"><h2>Save work</h2><label for="save-work-name">Name</label><input id="save-work-name" maxlength="80" required><p>Saved on this browser, without encryption.</p><p id="save-work-error" role="alert"></p><button class="btn primary" type="submit">Save</button><button class="btn" id="save-work-close" type="button">Cancel</button></form>';
  document.body.append(saveDialog);
  let pendingGuest = null;
  let adapter = null, authPending = false, page = '', currentSlide = 0, userPaused = false, hovered = false, focused = false;
  try { userPaused = localStorage.getItem('cuereport_preview_paused_v1') === 'true'; } catch { /* Preview controls still work without storage. */ }
  const rememberPause = () => { try { localStorage.setItem('cuereport_preview_paused_v1', String(userPaused)); } catch { /* Current-page choice remains active. */ } };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (id) => document.getElementById(id);
  const rawPath = () => !location.hash && ['/', '/ablation', '/statistics', '/system'].includes(location.pathname) ? 'check' : location.hash.replace(/^#\/?/, '').split('?')[0].replace(/\/$/, '');
  function go(hash) { location.hash = hash; }
  function syncTheme() { const dark = document.documentElement.dataset.theme === 'dark'; productHeader.querySelectorAll('.theme-toggle').forEach((b) => { b.textContent = dark ? 'Light theme' : 'Dark theme'; b.setAttribute('aria-pressed', String(dark)); }); }
  productHeader.querySelector('.theme-toggle').onclick = () => document.getElementById('btn-theme').click();
  new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); syncTheme();
  function preview(index) { currentSlide = index; surface.querySelectorAll('[data-slide]').forEach((s) => { s.hidden = Number(s.dataset.slide) !== index; }); surface.querySelectorAll('[data-slide-select]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.slideSelect) === index))); }
  function pauseLabel() { $('preview-pause').textContent = motion.matches ? 'Automatic previews off' : userPaused ? 'Play previews' : 'Pause previews'; $('preview-pause').disabled = motion.matches; }
  surface.querySelectorAll('[data-slide-select]').forEach((b) => b.addEventListener('click', () => { userPaused = true; rememberPause(); preview(Number(b.dataset.slideSelect)); pauseLabel(); }));
  $('preview-pause').onclick = () => { userPaused = !userPaused; rememberPause(); pauseLabel(); }; motion.addEventListener('change', pauseLabel); pauseLabel();
  const showcase = surface.querySelector('.product-showcase');
  showcase.onmouseenter = () => { hovered = true; }; showcase.onmouseleave = () => { hovered = false; };
  showcase.addEventListener('focusin', () => { focused = true; }); showcase.addEventListener('focusout', (e) => { focused = showcase.contains(e.relatedTarget); });
  setInterval(() => { if (page === 'home' && !document.hidden && !motion.matches && !userPaused && !hovered && !focused) preview((currentSlide + 1) % 4); }, 6500);
  // Lucide 1.73.0, ISC/Feather MIT; licence shipped in lucide-LICENSE.txt.
  const menuIcons = ['<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>', '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5M3 12A9 3 0 0 0 21 12"/>', '<path d="M12 5v16M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z"/>'];
  productHeader.querySelectorAll('.product-menu strong').forEach((label, index) => {
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [key, value] of Object.entries({ 'aria-hidden': 'true', focusable: 'false', width: '20', height: '20', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) icon.setAttribute(key, value);
    icon.innerHTML = menuIcons[index % menuIcons.length]; label.prepend(icon);
  });
  const menus = [...productHeader.querySelectorAll('nav details')];
  function closeMenus() { menus.forEach((d) => { d.open = false; }); }
  menus.forEach((d) => {
    d.addEventListener('mouseenter', () => { if (matchMedia('(hover:hover)').matches) { closeMenus(); d.open = true; } });
    d.addEventListener('mouseleave', () => { if (!d.contains(document.activeElement)) d.open = false; });
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape') { d.open = false; d.querySelector('summary').focus(); e.preventDefault(); e.stopPropagation(); } });
    d.addEventListener('focusout', (e) => { if (!d.contains(e.relatedTarget)) d.open = false; });
  });
  document.addEventListener('click', (e) => { if (!menus.some((d) => d.contains(e.target))) closeMenus(); });
  function logout() { profiles.logout(); history.replaceState(null, '', location.pathname + '#/'); window.dispatchEvent(new HashChangeEvent('hashchange')); }
  document.querySelectorAll('[data-logout]').forEach((b) => { b.onclick = logout; });
  surface.querySelectorAll('[data-demo]').forEach((b) => { b.onclick = () => { if (pendingGuest && !profiles.current()) { const value=pendingGuest.value; pendingGuest=null; adapter?.restore(value); } else go('#/app'); }; });
  $('password-toggle').onclick = () => { const show = $('profile-password').type === 'password'; $('profile-password').type = show ? 'text' : 'password'; $('password-toggle').textContent = show ? 'Hide password' : 'Show password'; $('password-toggle').setAttribute('aria-pressed', String(show)); };
  $('profile-form').onsubmit = async (e) => {
    e.preventDefault(); if (authPending) return;
    authPending = true; $('profile-submit').disabled = true; $('profile-error').textContent = 'Checking local profile…';
    const requestPage = page;
    const requestedReturn = new URLSearchParams(location.hash.split('?')[1] || '').get('return');
    const returnPath = ['/app', '/app/check', '/app/draft', '/app/examples', '/app/research', '/app/research/labels', '/app/research/methods'].includes(requestedReturn) ? '#' + requestedReturn : '#/app';
    try {
      await (rawPath() === 'signup' ? profiles.signup($('profile-name').value, $('profile-password').value) : profiles.login($('profile-name').value, $('profile-password').value));
      $('profile-password').value = ''; $('profile-error').textContent = '';
      if (page === requestPage && profiles.current()) { if (pendingGuest) { const value=pendingGuest.value; pendingGuest=null; adapter.restore(value); openSave(); } else go(returnPath); }
    } catch (error) { if (page === requestPage) $('profile-error').textContent = error.message; }
    finally { authPending = false; $('profile-submit').disabled = false; }
  };
  function renderSaved() {
    const user = profiles.current(); $('profile-identity').textContent = user ? user.name : 'No local profile is unlocked.';
    $('saved-work-list').replaceChildren(); $('delete-all-work').disabled = !user;
    if (!user) { $('saved-work-status').textContent = 'Log in to restore saved work. Guest tools remain available.'; return; }
    try {
      const records = profiles.list(); $('saved-work-status').textContent = records.length ? `${records.length} of 10 entries.` : 'No saved work.';
      for (const record of records) {
        const li = document.createElement('li'), label = document.createElement('strong'); label.textContent = record.name;
        const restore = document.createElement('button'); restore.type = 'button'; restore.textContent = 'Restore'; restore.setAttribute('aria-label', `Restore ${record.name}`);
        restore.onclick = () => { try { adapter.restore(record.value); } catch (error) { $('saved-work-status').textContent = error.message; } };
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Delete'; remove.setAttribute('aria-label', `Delete ${record.name}`);
        remove.onclick = async () => { try { await profiles.remove(record.id); renderSaved(); $('saved-work-status').focus(); } catch (error) { $('saved-work-status').textContent = error.message; } };
        li.append(label, restore, remove); $('saved-work-list').append(li);
      }
    } catch (error) { $('saved-work-status').textContent = error.message; }
  }
  $('saved-work-status').tabIndex = -1;
  $('delete-all-work').onclick = async () => { if (!confirm('Delete all saved work for this local profile? This cannot be undone.')) return; try { await profiles.clear(); renderSaved(); } catch (error) { $('saved-work-status').textContent = error.message; } };
  function openSave() { $('save-work-error').textContent = ''; $('save-work-name').value = ''; saveDialog.showModal(); $('save-work-name').focus(); }
  $('save-work').onclick = () => { if (!profiles.current()) { try { pendingGuest = { value: adapter.capture() }; go('#/login'); } catch(error) { alert(error.message); } return; } openSave(); };
  $('save-work-close').onclick = () => saveDialog.close();
  saveDialog.addEventListener('close', () => { if (!shell.hidden) $('save-work').focus(); });
  $('save-work-form').onsubmit = async (e) => { e.preventDefault(); const button = e.target.querySelector('[type=submit]'); button.disabled = true; try { await profiles.save($('save-work-name').value, adapter.capture()); saveDialog.close(); go('#/saved'); } catch (error) { if (saveDialog.open) $('save-work-error').textContent = error.message; } finally { button.disabled = false; } };
  const initialHero=$('hero-input').value;let heroGeneration=0;
  $('hero-input').addEventListener('input',()=>{heroGeneration++;$('hero-output').replaceChildren();$('hero-run').disabled=false;});
  let lastIdentity = null;
  profiles.subscribe((identity) => {heroGeneration++;$('hero-run').disabled=false;
    const loggedOut = lastIdentity && !identity; lastIdentity = identity;
    adapter?.reset(); $('hero-input').value=initialHero; $('hero-output').replaceChildren(); if (saveDialog.open) saveDialog.close();
    $('workspace-profile').textContent = identity ? identity.name : 'Local profile'; $('workspace-profile').href = identity ? '#/profile' : '#/login';
    bar.querySelector('[data-logout]').hidden = true;
    $('header-logout').hidden = !identity; $('header-profile').hidden = !identity; $('header-profile').textContent = identity?.name || '';
    if (loggedOut) { pendingGuest=null; $('hero-output').replaceChildren(); }
    if (loggedOut) { history.replaceState(null, '', location.pathname + '#/'); window.dispatchEvent(new HashChangeEvent('hashchange')); }
    else if (!identity && page === 'saved') renderSaved();
  });
  $('hero-run').onclick = async () => {
    const generation=++heroGeneration,ticket=profiles.revision(), text=$('hero-input').value; const button=$('hero-run'); button.disabled=true; $('hero-output').textContent='Checking…';
    try { const result=await adapter.hero(text); if(generation!==heroGeneration||ticket!==profiles.revision() || text!==$('hero-input').value)return; $('hero-output').replaceChildren();
      for(const text of result){const p=document.createElement('p');p.textContent=text;$('hero-output').append(p);}
    } catch(error){if(generation===heroGeneration&&ticket===profiles.revision()&&text===$('hero-input').value)$('hero-output').textContent=error.message+' Retry when the public assets are available.';}
    finally {if(generation===heroGeneration)button.disabled=false;}
  };
  $('hero-continue').onclick=()=>{try{adapter.heroContinue($('hero-input').value);}catch(error){$('hero-output').textContent=error.message;}};
  let routeInitialized = false;
  window.ProductSurface = {
    profiles,
    configure(value) { adapter = value; },
    route() {
      const wasInitialized = routeInitialized; routeInitialized = true;
      const legacyReport = !rawPath() && ['report', 'text'].some((key) => new URLSearchParams(location.hash.split('?')[1] || '').has(key));
      const path = legacyReport ? 'check' : rawPath(), next = ['', 'login', 'signup', 'saved', 'profile'].includes(path) ? path === '' ? 'home' : ['saved', 'profile'].includes(path) ? 'saved' : 'auth' : '';
      if (pendingGuest && next !== 'auth' && !profiles.current()) { const value=pendingGuest.value; pendingGuest=null; adapter?.restore(value); }
      const changed = page !== next || surface.dataset.route !== path;
      if (changed) { if (compactNavigation.matches) navigation.open = false; profiles.cancel(); $('profile-password').value = ''; $('profile-password').type = 'password'; $('password-toggle').textContent = 'Show password'; $('password-toggle').setAttribute('aria-pressed', 'false'); $('profile-error').textContent = ''; closeMenus(); }
      page = next; surface.dataset.route = path; surface.hidden = !next; shell.hidden = !!next;
      productHeader.dataset.workspace=String(!next);productHeader.querySelector('.theme-toggle').hidden=!next;if (!next) return false;
      surface.querySelectorAll('[data-product-page]').forEach((s) => { s.hidden = s.dataset.productPage !== next; });
      $('pending-guest-note').hidden = !pendingGuest;
      surface.querySelector('[data-product-page=auth] [data-demo]').textContent=pendingGuest?'Return to guest work':'Continue with Demo';
      productHeader.querySelector('.theme-toggle').hidden=!next;
      if (next === 'auth') { const signup = path === 'signup'; $('profile-heading').textContent = signup ? 'Create a local profile' : 'Log in'; $('profile-submit').textContent = signup ? 'Create profile' : 'Log in'; $('profile-password').autocomplete = signup ? 'new-password' : 'current-password'; $('profile-switch').href = signup ? '#/login' : '#/signup'; $('profile-switch').textContent = signup ? 'Log in to an existing profile' : 'Create a local profile'; }
      if (next === 'saved') renderSaved();
      document.title = `${next === 'home' ? 'CueReport' : next === 'auth' ? $('profile-heading').textContent + ' – CueReport' : 'Saved work – CueReport'}`;
      if (changed && wasInitialized) { surface.querySelector(`[data-product-page="${next}"] h1`).focus({ preventScroll: true }); window.scrollTo(0, 0); }
      return true;
    },
  };
  $('skip').addEventListener('click', (e) => { if (!surface.hidden) { e.preventDefault(); e.stopImmediatePropagation(); surface.querySelector('[data-product-page]:not([hidden]) h1').focus(); } }, true);
  // Render independently of snapshot loading, including when the public data fetch fails.
  window.ProductSurface.route();
})();
