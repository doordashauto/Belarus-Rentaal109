import test from 'node:test';
import assert from 'node:assert/strict';
import {loadData, validateData} from '../scripts/validate-data.mjs';

test('data.json holds only the agency\'s own listings and real details', () => {
  const d = loadData();
  assert.deepEqual(d.listings.map(o => o.id), ['PR-0033', 'PR-0034', 'PR-0035', 'PR-0036', 'PR-0037', 'PR-0038', 'PR-0039', 'PR-0040', 'PR-0041', 'PR-0042', 'PR-0043', 'PR-0044', 'PR-0045', 'PR-0046', 'PR-0031', 'PR-0032']);
  assert.ok(d.listings.every(o => o.photos.length >= 3));
  assert.deepEqual(d.listings.filter(o => o.status !== 'withdrawn').map(o => o.id), ['PR-0034']);
  const vyacha = d.listings.find(o => o.id === 'PR-0033'); assert.equal(vyacha.category, 'house'); assert.equal(vyacha.landSotka, 16);
  assert.equal(d.site.bot, 'Rental109_bot'); assert.equal(d.site.unp, '193630299'); assert.match(d.site.license, /02240\/452/);
  assert.equal(d.agents.length, 8); assert.ok(d.agents.every(a => a.team === false));
});

test('validation explains mistakes in plain language', () => {
  const d = structuredClone(loadData());
  const base = d.listings[0]; d.listings = [0, 1, 2, 3].map(i => ({...base, id: `PR-090${i}`}));
  d.listings.push({...d.listings[0], id: 'PR-0904', category: 'commercial', type: 'Ангар'});
  d.site.bot = '@bad bot'; d.listings[0].city = 'Пинск'; d.listings[1].agent = 99; d.listings[2].photos = ['../secret.sqlite']; d.listings[3].floor = 30;
  const errors = validateData(d).join('\n');
  assert.match(errors, /city/); assert.match(errors, /agent 99/); assert.match(errors, /images\//); assert.match(errors, /этаж/); assert.match(errors, /type — один из/); assert.match(errors, /site\.bot/);
});
