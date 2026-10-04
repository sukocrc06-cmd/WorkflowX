/* Test double for @supabase/supabase-js (auth + the user_data table used by core/sync.js). Injected by qa/e2e-v9-auth.js with
   addInitScript, so the app loads it instead of the vendored SDK. State lives in localStorage
   ('mock.sb') so it survives reloads, like a real backend would. Never shipped to users. */
(() => {
  const DB = () => { try { return JSON.parse(localStorage.getItem('mock.sb') || '{"users":{},"log":[]}') } catch { return { users: {}, log: [] } } };
  const put = d => localStorage.setItem('mock.sb', JSON.stringify(d));
  const log = (k, v) => { const d = DB(); d.log.push([k, v]); put(d) };
  const SKEY = 'workflowx.auth';
  const err = (message, status = 400, code = '') => ({ message, status, code, name: 'AuthApiError' });
  const mkUser = (email, meta = {}, provider = 'email', confirmed = true) => ({ id: 'u' + Math.random().toString(36).slice(2, 10), email, user_metadata: meta, app_metadata: { provider }, email_confirmed_at: confirmed ? new Date().toISOString() : null });
  window.supabase = {
    createClient(url, key, opts) {
      log('createClient', { url, flowType: opts && opts.auth && opts.auth.flowType });
      const ls = [];
      const emit = (ev, s) => ls.forEach(cb => { try { cb(ev, s) } catch (e) { console.error(e) } });
      const sess = () => { try { return JSON.parse(localStorage.getItem(SKEY) || 'null') } catch { return null } };
      const setSess = u => { const s = u ? { access_token: 't', user: u } : null; if (s) localStorage.setItem(SKEY, JSON.stringify(s)); else localStorage.removeItem(SKEY); return s };
      // "redirect back" with ?code=… → exchange (PKCE) → session (+ recovery event)
      const q = new URLSearchParams(location.search);
      if (q.has('code')) { const d = DB(), em = d.pending; const u = em && d.users[em] && d.users[em].user; if (u) { setSess(u); if (q.get('next') === 'reset') setTimeout(() => emit('PASSWORD_RECOVERY', sess()), 30) } }
      const auth = {
        async getSession() { return { data: { session: sess() }, error: null } },
        onAuthStateChange(cb) { ls.push(cb); return { data: { subscription: { unsubscribe() { } } } } },
        async signInWithPassword({ email, password }) {
          const d = DB(), r = d.users[email]; log('signIn', email);
          if (window.__sbFail) return { data: {}, error: window.__sbFail };
          if (!r || r.password !== password) return { data: {}, error: err('Invalid login credentials', 400, 'invalid_credentials') };
          if (!r.user.email_confirmed_at) return { data: {}, error: err('Email not confirmed', 400, 'email_not_confirmed') };
          const s = setSess(r.user); setTimeout(() => emit('SIGNED_IN', s)); return { data: { user: r.user, session: s }, error: null };
        },
        async signUp({ email, password, options }) {
          log('signUp', { email, redirect: options && options.emailRedirectTo || null }); const d = DB();
          if (d.users[email]) return { data: {}, error: err('User already registered', 422, 'user_already_exists') };
          const confirm = !!window.__sbConfirm; const u = mkUser(email, options && options.data || {}, 'email', !confirm);
          d.users[email] = { password, user: u }; put(d);
          if (confirm) return { data: { user: u, session: null }, error: null };
          const s = setSess(u); setTimeout(() => emit('SIGNED_IN', s)); return { data: { user: u, session: s }, error: null };
        },
        async signInWithOAuth({ provider, options }) { log('oauth', { provider, redirectTo: options && options.redirectTo }); return { data: {}, error: null } },
        async resetPasswordForEmail(email, o) { log('reset', { email, redirectTo: o && o.redirectTo }); const d = DB(); d.pending = email; put(d); return { data: {}, error: null } },
        async resend(o) { log('resend', o.email); return { data: {}, error: null } },
        async updateUser({ password }) {
          const s = sess(); if (!s) return { data: {}, error: err('Auth session missing', 401) };
          const d = DB(), r = d.users[s.user.email]; if (r.password === password) return { data: {}, error: err('New password should be different from the old password.', 422, 'same_password') };
          r.password = password; put(d); log('updateUser', s.user.email); return { data: { user: s.user }, error: null };
        },
        async signOut(o) { log('signOut', o && o.scope); setSess(null); setTimeout(() => emit('SIGNED_OUT', null)); return { error: null } },
        __expire() { setSess(null); emit('SIGNED_OUT', null) }
      };
      window.__sbAuth = auth;
      /* Minimal PostgREST builder: select/insert/update + eq + maybeSingle, owner-only like RLS,
         rev must grow by exactly 1 (the SQL trigger). Rows live in mock.sb.rows. */
      const pick = (row, cols) => { if (!row) return null; if (!cols || cols === '*') return JSON.parse(JSON.stringify(row)); const o = {}; cols.split(',').forEach(c => { o[c.trim()] = JSON.parse(JSON.stringify(row[c.trim()])) }); return o };
      async function run(st) {
        await new Promise(r => setTimeout(r, window.__sbDbDelay || 10));
        if (window.__sbNoTable) return { data: null, error: { code: 'PGRST205', message: "Could not find the table 'public.user_data' in the schema cache" } };
        if (window.__sbDbFail) return { data: null, error: { message: 'Failed to fetch', code: '' } };
        const s = sess(), uid = s && s.user.id, d = DB(); d.rows = d.rows || {};
        const match = row => row && row.user_id === uid && st.f.every(([k, v]) => row[k] === v);
        log('db.' + st.op, st.op === 'select' ? st.cols : st.p && st.p.rev);
        if (st.op === 'select') { const row = Object.values(d.rows).find(match); return { data: pick(row, st.cols), error: null } }
        if (st.op === 'insert') { if (!uid || st.p.user_id !== uid) return { data: null, error: { code: '42501', message: 'new row violates row-level security policy for table "user_data"' } }; if (d.rows[uid]) return { data: null, error: { code: '23505', message: 'duplicate key value' } }; d.rows[uid] = { ...JSON.parse(JSON.stringify(st.p)), updated_at: new Date().toISOString() }; put(d); return { data: pick(d.rows[uid], st.ret), error: null } }
        if (st.op === 'update') { const row = d.rows[uid]; if (!match(row)) return { data: null, error: null }; if (st.p.rev !== row.rev + 1) return { data: null, error: { code: '40001', message: 'rev bir artmalı' } }; Object.assign(row, JSON.parse(JSON.stringify(st.p)), { updated_at: new Date().toISOString() }); put(d); return { data: pick(row, st.ret), error: null } }
      }
      const from = table => { const st = { table, op: 'select', cols: '*', f: [] }; const b = { select(c) { if (st.op === 'select') st.cols = c; else st.ret = c; return b }, insert(p) { st.op = 'insert'; st.p = p; return b }, update(p) { st.op = 'update'; st.p = p; return b }, eq(k, v) { st.f.push([k, v]); return b }, maybeSingle() { return run(st) }, then(a, c) { return run(st).then(a, c) } }; return b };
      return { auth, from };
    }
  };
})();
