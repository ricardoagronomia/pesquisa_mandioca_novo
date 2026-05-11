(function () {
  var API_URL = '/api/query';

  function QB(table) {
    this._table = table; this._select = '*'; this._filters = [];
    this._order = []; this._limit = null; this._single = false;
    this._maybeSingle = false; this._method = 'GET'; this._body = null;
    this._upsert = false; this._onConflict = null;
    this._ignoreDuplicates = false; this._count = null; this._head = false;
  }
  QB.prototype.select = function(cols, opts) {
    this._select = cols || '*';
    if (opts && opts.count) this._count = opts.count;
    if (opts && opts.head)  this._head  = true;
    return this;
  };
  QB.prototype.insert = function(p) { this._method = 'POST';  this._body = p; return this; };
  QB.prototype.update = function(p) { this._method = 'PATCH'; this._body = p; return this; };
  QB.prototype.delete = function()  { this._method = 'DELETE';               return this; };
  QB.prototype.upsert = function(p, opts) {
    this._method = 'POST'; this._body = p; this._upsert = true;
    if (opts) { this._onConflict = opts.onConflict || null; this._ignoreDuplicates = opts.ignoreDuplicates || false; }
    return this;
  };
  QB.prototype.eq  = function(c,v) { this._filters.push({op:'eq', col:c,val:v}); return this; };
  QB.prototype.is  = function(c,v) { this._filters.push({op:'is', col:c,val:v}); return this; };
  QB.prototype.in  = function(c,v) { this._filters.push({op:'in', col:c,val:v}); return this; };
  QB.prototype.gte = function(c,v) { this._filters.push({op:'gte',col:c,val:v}); return this; };
  QB.prototype.lte = function(c,v) { this._filters.push({op:'lte',col:c,val:v}); return this; };
  QB.prototype.order = function(c,o) { this._order.push({col:c,ascending:o?o.ascending!==false:true}); return this; };
  QB.prototype.limit = function(n) { this._limit = n; return this; };
  QB.prototype.single = function() { this._single = true; return this; };
  QB.prototype.maybeSingle = function() { this._maybeSingle = true; return this; };
  QB.prototype.then = function(res, rej) { return this._execute().then(res, rej); };
  QB.prototype._execute = function() {
    var self = this;
    var payload = {
      table: self._table, method: self._method, select: self._select,
      filters: self._filters, order: self._order, limit: self._limit,
      single: self._single, maybeSingle: self._maybeSingle, body: self._body,
      upsert: self._upsert, onConflict: self._onConflict,
      ignoreDuplicates: self._ignoreDuplicates, count: self._count, head: self._head
    };
    
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(r) {
      return r.json();
    }).catch(function(err) {
      console.error('Sem conexao com server.ts:', err.message);
      return { data: null, error: { message: 'Sem conexao com API local: ' + err.message } };
    });
  };

  window.supabase = {
    createClient: function() {
      return {
        from: function(table) { return new QB(table); },
        auth: {
          getSession: function() {
            return Promise.resolve({ data: { session: { user: { id: 'local-admin', email: 'admin@local' } } }, error: null });
          },
          signOut: function() { return Promise.resolve({}); },
          signInWithPassword: async (creds) => ({ data: { user: { id: 'local-admin', email: creds.email } }, error: null }),
          signUp: async (creds) => ({ data: { user: { id: 'local-admin', email: creds.email } }, error: null })
        }
      };
    }
  };

  console.log('db-local.js carregado - usando PostgreSQL local backend');
})();
