'use strict';
// Drop-in replacement for buffer-equal-constant-time@1.0.1, which crashes on
// Node >= 25 because it reads `SlowBuffer.prototype` (SlowBuffer was removed).
// Used by jwa -> jws -> jsonwebtoken. Wired in through "overrides" in package.json.
const { timingSafeEqual } = require('crypto');

function bufferEq(a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) return false;
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// The original module exposed install/restore to patch Buffer.prototype.equal.
bufferEq.install = function install() {
  Buffer.prototype.equal = function equal(that) {
    return bufferEq(this, that);
  };
};
bufferEq.restore = function restore() {};

module.exports = bufferEq;
