const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Generates a Crockford's Base32 time-sortable unique identifier (ULID).
 * Stateless, does not require transaction locks or counters.
 * 10 characters of timestamp + 16 characters of randomness.
 */
function generateUlid() {
  let now = Date.now();
  let timeChars = '';
  for (let i = 0; i < 10; i++) {
    timeChars = ENCODING.charAt(now % 32) + timeChars;
    now = Math.floor(now / 32);
  }
  let randChars = '';
  for (let i = 0; i < 16; i++) {
    randChars += ENCODING.charAt(Math.floor(Math.random() * 32));
  }
  return timeChars + randChars;
}

module.exports = {
  generateUlid,
};
