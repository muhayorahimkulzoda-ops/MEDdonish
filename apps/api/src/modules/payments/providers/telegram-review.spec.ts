import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractStartChatId } from './telegram-review';

test('binds admin chat from /start', () => {
  assert.equal(
    extractStartChatId({
      message: { text: '/start', chat: { id: 123456 } },
    }),
    123456,
  );
  assert.equal(
    extractStartChatId({
      message: { text: '/start@meddonish_bot', chat: { id: 99 } },
    }),
    99,
  );
});

test('ignores other telegram updates', () => {
  assert.equal(extractStartChatId({ message: { text: 'hello', chat: { id: 1 } } }), null);
  assert.equal(extractStartChatId({ callback_query: { data: 'p:y:order' } }), null);
});
